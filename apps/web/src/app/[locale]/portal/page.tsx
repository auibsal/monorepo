import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { getTranslations } from 'next-intl/server';

export default async function MemberPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Portal' });
  const cookieStore = await cookies();

  // Initialize Supabase Server Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 1. Verify Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // 2. Fetch User Profile & Calendar Token
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // 3. Fetch User's Submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, title, status, submitted_at, type')
    .eq('author_id', user.id)
    .order('submitted_at', { ascending: false });

  // 4. Fetch Upcoming Events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  // Generate the feed URL. 
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://auibsal.org';
  const calendarFeedUrl = `${baseUrl}/api/calendar/${profile?.calendar_token}/events.ics`;

  return (
    <div className="min-h-screen bg-auib-white text-auib-charcoal p-8 md:p-16 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="border-b-4 border-auib-charcoal pb-8">
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight mb-2">
            Scholar's Portal
          </h1>
          <p className="text-lg font-medium text-auib-charcoal/70">
            Welcome back, {profile?.full_name || 'Scholar'}.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Submissions Section */}
            <section>
              <h2 className="text-2xl font-bold uppercase border-b-2 border-auib-charcoal pb-2 mb-6">
                My Submissions
              </h2>
              {submissions && submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="p-4 border-2 border-auib-charcoal flex justify-between items-center bg-white shadow-[4px_4px_0px_0px_#273237]">
                      <div>
                        <h3 className="font-bold text-lg">{sub.title}</h3>
                        <p className="text-sm text-auib-charcoal/70 capitalize">{sub.type}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 text-xs font-bold uppercase border-2 ${
                          sub.status === 'accepted' ? 'bg-green-100 border-green-800 text-green-800' :
                          sub.status === 'rejected' ? 'bg-red-100 border-red-800 text-red-800' :
                          'bg-auib-charcoal/10 border-auib-charcoal text-auib-charcoal'
                        }`}>
                          {sub.status.replace('_', ' ')}
                        </span>
                        <p className="text-xs mt-2 text-auib-charcoal/60">
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-auib-charcoal/60 italic border-l-4 border-auib-red pl-4 py-2">
                  You have not submitted any manuscripts to the journal yet.
                </p>
              )}
            </section>

            {/* Events Section */}
            <section>
              <h2 className="text-2xl font-bold uppercase border-b-2 border-auib-charcoal pb-2 mb-6">
                Upcoming Society Events
              </h2>
              {events && events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((event) => (
                    <div key={event.id} className="border-2 border-auib-charcoal p-4 shadow-[4px_4px_0px_0px_#9C213E] flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold">{locale === 'ar' ? event.title_ar : event.title_en}</h3>
                          {event.is_members_only && (
                            <span className="text-[10px] bg-auib-red text-white px-2 py-1 uppercase font-bold tracking-wider">
                              Exclusive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-auib-charcoal/80 mb-4">
                          {new Date(event.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          <br/>@ {event.location}
                        </p>
                      </div>
                      <button className="w-full bg-auib-charcoal text-white font-bold uppercase py-2 hover:bg-auib-red transition-colors text-sm">
                        RSVP Now
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-auib-charcoal/60 italic border-l-4 border-auib-charcoal pl-4 py-2">
                  No upcoming events scheduled at this time.
                </p>
              )}
            </section>

          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            
            {/* Private Calendar Integration */}
            <div className="border-2 border-auib-charcoal bg-auib-charcoal text-white p-6 shadow-[8px_8px_0px_0px_#9C213E]">
              <h3 className="font-bold text-xl uppercase mb-2">Calendar Sync</h3>
              <p className="text-sm text-white/80 mb-6">
                Subscribe to your private Society feed to automatically sync exclusive events to your Apple, Google, or Outlook Calendar.
              </p>
              
              {/* Replaced input with a clean, functional link */}
              <a 
                href={calendarFeedUrl}
                className="block w-full text-center bg-white text-auib-charcoal font-bold uppercase py-3 hover:bg-auib-red hover:text-white transition-colors text-sm border-2 border-transparent"
              >
                Add to Calendar
              </a>

              <p className="text-xs text-white/50 mt-4 italic text-center">
                * Do not share this link. It is tied to your university ID.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="border-2 border-auib-charcoal p-6 bg-white">
              <h3 className="font-bold text-lg uppercase mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a href={`/${locale}/submit`} className="block w-full text-center border-2 border-auib-charcoal py-2 font-bold uppercase hover:bg-auib-charcoal hover:text-white transition-colors">
                  Submit Manuscript
                </a>
                <a href={`/${locale}/charter`} className="block w-full text-center border-2 border-auib-charcoal py-2 font-bold uppercase hover:bg-auib-charcoal hover:text-white transition-colors">
                  Read Bylaws
                </a>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full text-center border-2 border-auib-red text-auib-red py-2 font-bold uppercase hover:bg-auib-red hover:text-white transition-colors">
                    Sign Out
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
