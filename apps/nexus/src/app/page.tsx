import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function NexusHome() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  let role = 'user';
  let calendarToken = '';
  if (user) {
    const { data } = await supabase.from('users').select('role, calendar_token').eq('id', user.id).single();
    if (data) {
      role = data.role;
      calendarToken = data.calendar_token;
    }
  }

  const isEditor = role === 'editor' || role === 'admin';

  // Fetch submissions for the member
  let memberSubmissions: any[] = [];
  if (user) {
    const { data } = await supabase.from('submissions').select('*').eq('author_id', user.id);
    if (data) {
      memberSubmissions = data;
    }
  }

  // Fetch metrics for editors
  let pendingSubmissionsCount = 0;
  let activeMembersCount = 0;
  let upcomingEventsCount = 0;

  if (isEditor) {
    const [pendingRes, membersRes, eventsRes] = await Promise.all([
      supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['member', 'editor', 'admin']),
      supabase.from('events').select('*', { count: 'exact', head: true }).gt('starts_at', new Date().toISOString())
    ]);

    pendingSubmissionsCount = pendingRes.count || 0;
    activeMembersCount = membersRes.count || 0;
    upcomingEventsCount = eventsRes.count || 0;
  }

  return (
    <div className="space-y-12">
      {isEditor && (
        <div>
          <h2 className="text-2xl font-bold mb-6 uppercase tracking-widest text-auib-white">Editorial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-auib-charcoal p-6 border-2 border-auib-white shadow-[8px_8px_0px_0px_#FFFFFF]">
              <h3 className="text-lg font-bold text-auib-white/70 mb-2 uppercase tracking-wide">Pending Submissions</h3>
              <p className="text-4xl font-bold text-auib-white">{pendingSubmissionsCount}</p>
            </div>
            <div className="bg-auib-charcoal p-6 border-2 border-auib-white shadow-[8px_8px_0px_0px_#FFFFFF]">
              <h3 className="text-lg font-bold text-auib-white/70 mb-2 uppercase tracking-wide">Active Members</h3>
              <p className="text-4xl font-bold text-auib-white">{activeMembersCount}</p>
            </div>
            <div className="bg-auib-charcoal p-6 border-2 border-auib-white shadow-[8px_8px_0px_0px_#FFFFFF]">
              <h3 className="text-lg font-bold text-auib-white/70 mb-2 uppercase tracking-wide">Upcoming Events</h3>
              <p className="text-4xl font-bold text-auib-white">{upcomingEventsCount}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6 uppercase tracking-widest text-auib-white">Member Portal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-auib-charcoal p-6 border-2 border-auib-white shadow-[8px_8px_0px_0px_#FFFFFF]">
            <h3 className="text-lg font-bold text-auib-white mb-4 uppercase tracking-wide">My Submissions</h3>
            {memberSubmissions.length > 0 ? (
              <ul className="space-y-4">
                {memberSubmissions.map(sub => (
                  <li key={sub.id} className="border border-auib-white/20 p-3">
                    <p className="font-bold text-auib-white truncate uppercase">{sub.title}</p>
                    <div className="flex justify-between items-center mt-2 text-sm font-mono text-auib-white/70">
                      <span className="uppercase">{sub.type}</span>
                      <span className="bg-auib-white text-auib-charcoal px-2 py-0.5">{sub.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-auib-white/70 font-mono text-sm">You have no active submissions.</p>
            )}
          </div>
          <div className="bg-auib-charcoal p-6 border-2 border-auib-white shadow-[8px_8px_0px_0px_#FFFFFF] h-fit">
            <h3 className="text-lg font-bold text-auib-white mb-4 uppercase tracking-wide">Account Status</h3>
            <div className="space-y-4">
              <p className="text-auib-white/70 font-mono text-sm">Active {role.charAt(0).toUpperCase() + role.slice(1)}</p>

              {calendarToken && (
                <div className="pt-4 border-t border-auib-white/20">
                  <h4 className="text-sm font-bold text-auib-white mb-2 uppercase tracking-wide">Calendar Sync</h4>
                  <p className="text-xs text-auib-white/70 font-mono mb-2">Sync your events to Apple Calendar, Google Calendar, or Outlook.</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.auibsal.org'}/api/calendar/${calendarToken}/events.ics`}
                      className="bg-auib-white/10 border border-auib-white/30 text-auib-white font-mono text-xs p-2 w-full truncate"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
