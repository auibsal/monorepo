import { createClient } from 'auth/server';
import { headers } from 'next/headers';
import { Calendar, Users, FileText, Activity } from 'lucide-react';

// CRITICAL: Force dynamic rendering so dashboard metrics never cache
export const dynamic = 'force-dynamic';

export default async function NexusHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Instantly grab the role from the secure edge headers we wired in layout.tsx
  const headersList = await headers();
  const role = headersList.get('x-user-role') || 'user';
  const isEditor = role === 'editor' || role === 'admin';

  let calendarToken = '';
  let memberSubmissions: any[] = [];
  
  if (user) {
    // 2. Run the remaining independent queries in parallel to cut load times in half
    const [userRes, subRes] = await Promise.all([
      supabase.from('users').select('calendar_token').eq('id', user.id).single(),
      supabase.from('submissions').select('*').eq('author_id', user.id)
    ]);
    
    if (userRes.data) calendarToken = userRes.data.calendar_token;
    if (subRes.data) memberSubmissions = subRes.data;
  }

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

  // 3. Fallback to the environment variable, not a hardcoded production string
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.auibsal.org';

  return (
    <div className="space-y-16">
      {isEditor && (
        <section>
          <div className="flex items-center gap-4 mb-8 border-b-4 border-auib-charcoal pb-4">
             <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Editorial Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] flex flex-col hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#273237] transition-all">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-bold text-auib-charcoal uppercase tracking-wide">Pending Submissions</h3>
                 <FileText className="text-auib-red w-6 h-6" />
              </div>
              <p className="text-5xl font-black text-auib-charcoal mt-auto">{pendingSubmissionsCount}</p>
            </div>
            
            <div className="bg-white p-8 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] flex flex-col hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#273237] transition-all">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-bold text-auib-charcoal uppercase tracking-wide">Active Members</h3>
                 <Users className="text-auib-red w-6 h-6" />
              </div>
              <p className="text-5xl font-black text-auib-charcoal mt-auto">{activeMembersCount}</p>
            </div>

            <div className="bg-white p-8 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] flex flex-col hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#273237] transition-all">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-bold text-auib-charcoal uppercase tracking-wide">Upcoming Events</h3>
                 <Calendar className="text-auib-red w-6 h-6" />
              </div>
              <p className="text-5xl font-black text-auib-charcoal mt-auto">{upcomingEventsCount}</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-4 mb-8 border-b-4 border-auib-charcoal pb-4">
             <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Member Portal</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-white p-8 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237]">
            <h3 className="text-xl font-bold text-auib-charcoal mb-6 uppercase tracking-wide">My Submissions</h3>
            {memberSubmissions.length > 0 ? (
              <ul className="space-y-4">
                {memberSubmissions.map(sub => (
                  <li key={sub.id} className="border-2 border-auib-charcoal p-4 group hover:border-auib-red transition-colors">
                    <p className="font-bold text-auib-charcoal truncate uppercase text-lg mb-2">{sub.title}</p>
                    <div className="flex justify-between items-center text-sm font-bold text-auib-charcoal/70">
                      <span className="uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        {sub.type}
                      </span>
                      <span className={`px-3 py-1 uppercase tracking-widest text-xs border-2 ${sub.status === 'approved' ? 'bg-auib-charcoal text-white border-auib-charcoal' : 'bg-white text-auib-charcoal border-auib-charcoal'}`}>
                        {sub.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-dashed border-auib-charcoal/30 p-8 text-center">
                 <p className="text-auib-charcoal/70 font-bold uppercase tracking-widest text-sm">You have no active submissions.</p>
              </div>
            )}
          </div>

          <div className="bg-auib-charcoal p-8 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] h-fit text-white">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wide">Account Status</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                 <p className="font-bold uppercase tracking-widest text-white/90">Active {role}</p>
              </div>
              
              {calendarToken && (
                <div className="pt-6 border-t-2 border-white/20">
                  <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-auib-red" />
                    Calendar Sync
                  </h4>
                  <p className="text-xs text-white/70 font-medium mb-4 leading-relaxed">
                    Subscribe to this feed to automatically sync society events to your Apple Calendar, Google Calendar, or Outlook.
                  </p>
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${webUrl}/api/calendar/${calendarToken}/events.ics`}
                      className="bg-white/10 border-2 border-white/30 text-white font-mono text-xs p-3 w-full truncate focus:outline-none focus:border-auib-red"
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
