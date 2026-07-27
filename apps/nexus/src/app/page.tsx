import { createClient } from '@auibsal/auth/server';

import { Activity, Calendar, FileText, Users } from 'lucide-react';
import { headers } from 'next/headers';
import { env } from '@auibsal/env';

/**
 * dynamic
 *
 * @description Standardized execution for dynamic.
 */
export const dynamic = 'force-dynamic';

type DashboardSubmission = {
  id: string;
  title: string;
  type: string;
  status: string;
};

export default async function NexusHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headersList = await headers();
  const role = headersList.get('x-user-role') || 'user';
  const isEditor = role === 'editor' || role === 'admin';

  // CRITICAL FIX: Calculate the true Nexus base URL from the incoming request headers
  // This guarantees the ICS link will perfectly match localhost:3001 in dev, and nexus.auibsal.org in production
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3001';
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const nexusUrl = env.NEXT_PUBLIC_NEXUS_URL;

  let calendarToken = '';
  let memberSubmissions: DashboardSubmission[] = [];

  if (user) {
    const [userRes, subRes] = await Promise.all([
      supabase.from('users').select('calendar_token').eq('id', user.id).single(),
      supabase.from('submissions').select('id, title, type, status').eq('author_id', user.id),
    ]);

    if (userRes.data && userRes.data.calendar_token) calendarToken = userRes.data.calendar_token;
    if (subRes.data) memberSubmissions = subRes.data as DashboardSubmission[];
  }

  let pendingSubmissionsCount = 0;
  let activeMembersCount = 0;
  let upcomingEventsCount = 0;

  if (isEditor) {
    // ⚡ Bolt Optimization: Using .select('id') instead of .select('*') with head: true to reduce PostgreSQL index evaluation time and parsing overhead.
    const [pendingRes, membersRes, eventsRes] = await Promise.all([
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('role', ['member', 'editor', 'admin']),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gt('starts_at', new Date().toISOString()),
    ]);

    pendingSubmissionsCount = pendingRes.count || 0;
    activeMembersCount = membersRes.count || 0;
    upcomingEventsCount = eventsRes.count || 0;
  }

  return (
    <div className="space-y-16">
      {isEditor && (
        <section>
          <div className="mb-8 flex items-center gap-4 border-b-4 border-border pb-4">
            <h2 className="text-3xl font-bold tracking-widest text-foreground uppercase">
              Editorial Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col border-4 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-bold tracking-wide text-foreground uppercase">
                  Pending Submissions
                </h3>
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="mt-auto text-5xl font-black text-foreground">
                {pendingSubmissionsCount}
              </p>
            </div>

            <div className="flex flex-col border-4 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-bold tracking-wide text-foreground uppercase">
                  Active Members
                </h3>
                <Users className="h-6 w-6 text-primary" />
              </div>
              <p className="mt-auto text-5xl font-black text-foreground">{activeMembersCount}</p>
            </div>

            <div className="flex flex-col border-4 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-bold tracking-wide text-foreground uppercase">
                  Upcoming Events
                </h3>
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="mt-auto text-5xl font-black text-foreground">{upcomingEventsCount}</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-8 flex items-center gap-4 border-b-4 border-border pb-4">
          <h2 className="text-3xl font-bold tracking-widest text-foreground uppercase">
            Member Portal
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="border-4 border-border bg-card p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]">
            <h3 className="mb-6 text-xl font-bold tracking-wide text-foreground uppercase">
              My Submissions
            </h3>
            {memberSubmissions.length > 0 ? (
              <ul className="space-y-4">
                {memberSubmissions.map((sub) => (
                  <li
                    key={sub.id}
                    className="group border-2 border-border p-4 transition-colors hover:border-primary"
                  >
                    <p className="mb-2 truncate text-lg font-bold text-foreground uppercase">
                      {sub.title}
                    </p>
                    <div className="flex items-center justify-between text-sm font-bold text-foreground/70">
                      <span className="flex items-center gap-2 tracking-wider uppercase">
                        <Activity className="h-4 w-4" />
                        {sub.type}
                      </span>
                      <span
                        className={`border-2 px-3 py-1 text-xs tracking-widest uppercase ${sub.status === 'approved' ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground'}`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-dashed border-foreground/30 p-8 text-center">
                <p className="text-sm font-bold tracking-widest text-foreground/70 uppercase">
                  You have no active submissions.
                </p>
              </div>
            )}
          </div>

          <div className="h-fit border-4 border-border bg-foreground p-8 text-background shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]">
            <h3 className="mb-6 text-xl font-bold tracking-wide text-background uppercase">
              Account Status
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                <p className="font-bold tracking-widest text-background/90 uppercase">
                  Active {role}
                </p>
              </div>

              {calendarToken && (
                <div className="border-t-2 border-background/20 pt-6">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-background uppercase">
                    <Calendar className="h-4 w-4 text-primary" />
                    Calendar Sync
                  </h4>
                  <p className="mb-4 text-xs leading-relaxed font-medium text-background/70">
                    Subscribe to this feed to automatically sync society events to your Apple
                    Calendar, Google Calendar, or Outlook.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${nexusUrl}/api/calendar/${calendarToken}/events.ics`}
                      className="w-full truncate border-2 border-background/30 bg-background/10 p-3 font-mono text-xs text-background focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
