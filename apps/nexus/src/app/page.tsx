import { headers } from 'next/headers';

import { Activity, Calendar, FileText, Users } from 'lucide-react';

import { createClient } from '@auibsal/auth/server';

// CRITICAL: Force dynamic rendering so dashboard metrics never cache
export const dynamic = 'force-dynamic';

// Define the expected submission shape to eliminate the 'any' type trap
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

  // 1. Instantly grab the role from the secure edge headers we wired in layout.tsx
  const headersList = await headers();
  const role = headersList.get('x-user-role') || 'user';
  const isEditor = role === 'editor' || role === 'admin';

  let calendarToken = '';
  let memberSubmissions: DashboardSubmission[] = [];

  if (user) {
    // 2. Run the remaining independent queries in parallel to cut load times in half
    const [userRes, subRes] = await Promise.all([
      supabase.from('users').select('calendar_token').eq('id', user.id).single(),
      // ⚡ Bolt Performance Optimization
      supabase.from('submissions').select('id, title, type, status').eq('author_id', user.id),
    ]);

    if (userRes.data) calendarToken = userRes.data.calendar_token;
    if (subRes.data) memberSubmissions = subRes.data as DashboardSubmission[];
  }

  let pendingSubmissionsCount = 0;
  let activeMembersCount = 0;
  let upcomingEventsCount = 0;

  if (isEditor) {
    const [pendingRes, membersRes, eventsRes] = await Promise.all([
      supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('role', ['member', 'editor', 'admin']),
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gt('starts_at', new Date().toISOString()),
    ]);

    pendingSubmissionsCount = pendingRes.count || 0;
    activeMembersCount = membersRes.count || 0;
    upcomingEventsCount = eventsRes.count || 0;
  }

  // 3. Fallback to the environment variable, not a hardcoded production string
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';

  return (
    <div className="space-y-16">
      {isEditor && (
        <section>
          <div className="border-border mb-8 flex items-center gap-4 border-b-4 pb-4">
            <h2 className="text-foreground text-3xl font-bold uppercase tracking-widest">
              Editorial Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Swapped to semantic background, border, and dynamic shadow variables */}
            <div className="bg-card border-border flex flex-col border-4 p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-foreground text-lg font-bold uppercase tracking-wide">
                  Pending Submissions
                </h3>
                <FileText className="text-primary h-6 w-6" />
              </div>
              <p className="text-foreground mt-auto text-5xl font-black">
                {pendingSubmissionsCount}
              </p>
            </div>

            <div className="bg-card border-border flex flex-col border-4 p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-foreground text-lg font-bold uppercase tracking-wide">
                  Active Members
                </h3>
                <Users className="text-primary h-6 w-6" />
              </div>
              <p className="text-foreground mt-auto text-5xl font-black">{activeMembersCount}</p>
            </div>

            <div className="bg-card border-border flex flex-col border-4 p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-foreground text-lg font-bold uppercase tracking-wide">
                  Upcoming Events
                </h3>
                <Calendar className="text-primary h-6 w-6" />
              </div>
              <p className="text-foreground mt-auto text-5xl font-black">{upcomingEventsCount}</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="border-border mb-8 flex items-center gap-4 border-b-4 pb-4">
          <h2 className="text-foreground text-3xl font-bold uppercase tracking-widest">
            Member Portal
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="bg-card border-border border-4 p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]">
            <h3 className="text-foreground mb-6 text-xl font-bold uppercase tracking-wide">
              My Submissions
            </h3>
            {memberSubmissions.length > 0 ? (
              <ul className="space-y-4">
                {memberSubmissions.map((sub) => (
                  <li
                    key={sub.id}
                    className="border-border hover:border-primary group border-2 p-4 transition-colors"
                  >
                    <p className="text-foreground mb-2 truncate text-lg font-bold uppercase">
                      {sub.title}
                    </p>
                    <div className="text-foreground/70 flex items-center justify-between text-sm font-bold">
                      <span className="flex items-center gap-2 uppercase tracking-wider">
                        <Activity className="h-4 w-4" />
                        {sub.type}
                      </span>
                      {/* Semantic badge inversion logic */}
                      <span
                        className={`border-2 px-3 py-1 text-xs uppercase tracking-widest ${sub.status === 'approved' ? 'bg-foreground text-background border-foreground' : 'bg-card text-foreground border-border'}`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-foreground/30 border-2 border-dashed p-8 text-center">
                <p className="text-foreground/70 text-sm font-bold uppercase tracking-widest">
                  You have no active submissions.
                </p>
              </div>
            )}
          </div>

          {/* Account status inverted with semantic tokens to ensure legibility in all color modes */}
          <div className="bg-foreground border-border text-background h-fit border-4 p-8 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]">
            <h3 className="text-background mb-6 text-xl font-bold uppercase tracking-wide">
              Account Status
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                <p className="text-background/90 font-bold uppercase tracking-widest">
                  Active {role}
                </p>
              </div>

              {calendarToken && (
                <div className="border-background/20 border-t-2 pt-6">
                  <h4 className="text-background mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                    <Calendar className="text-primary h-4 w-4" />
                    Calendar Sync
                  </h4>
                  <p className="text-background/70 mb-4 text-xs font-medium leading-relaxed">
                    Subscribe to this feed to automatically sync society events to your Apple
                    Calendar, Google Calendar, or Outlook.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${webUrl}/api/calendar/${calendarToken}/events.ics`}
                      className="bg-background/10 border-background/30 text-background focus:border-primary w-full truncate border-2 p-3 font-mono text-xs focus:outline-none"
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
