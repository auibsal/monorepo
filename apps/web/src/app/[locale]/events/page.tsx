import { getTranslations } from 'next-intl/server';
import { createClient } from 'auth/server';


export const revalidate = 3600; // Prevent static generation caching issues for this page

export default async function Events({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'EventsPage' });

  const supabase = await createClient();

  const { data: events, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true });

  const upcomingEvents = !error && events ? events : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <header className="mb-20  relative">
        <div className="absolute inset-0 flex items-start -z-10 opacity-5">
          <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/></svg>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-auib-charcoal mb-6 tracking-tight">
          {t('pageTitle')}
        </h1>
        <div className="w-24 h-1.5 bg-auib-red mb-8 rounded-full"></div>
        <p className="text-xl text-auib-charcoal/70 max-w-2xl leading-relaxed font-light">
          {t('pageSubtitle')}
        </p>
      </header>

      <div className="space-y-10">
        {upcomingEvents.length === 0 ? (
            <p className="text-xl text-auib-charcoal/70">{locale === 'ar' ? 'لا توجد أحداث قادمة حالياً.' : 'No upcoming events at this time.'}</p>
        ) : upcomingEvents.map((event) => (
          <article key={event.id} className="flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-lg border border-auib-charcoal/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="md:w-1/3 bg-gradient-to-br from-auib-charcoal to-[#1a2225] p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-auib-charcoal/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-auib-red/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <span className="text-auib-red font-bold text-2xl mb-3 relative z-10">
                  {new Date(event.starts_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-sm font-medium text-white/80 uppercase tracking-widest flex items-center gap-2 relative z-10">
                <svg className="w-5 h-5 text-auib-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {event.location}
              </span>
            </div>
            <div className="md:w-2/3 p-10 flex flex-col justify-center bg-white relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-auib-red scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
              <h2 className="text-3xl font-bold mb-4 text-auib-charcoal group-hover:text-auib-red transition-colors">
                  {locale === 'ar' ? event.title_ar : event.title_en}
              </h2>
              <p className="text-lg leading-relaxed text-auib-charcoal/70">
                  {locale === 'ar' ? event.description_ar : event.description_en}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
