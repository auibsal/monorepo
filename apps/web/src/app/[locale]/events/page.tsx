
import { getTranslations } from 'next-intl/server';
import { createClient } from '@auibsal/auth/server';
import { Calendar, MapPin } from 'lucide-react';

// CRITICAL: 0 completely prevents caching to ensure live event updates.
export const revalidate = 0; 

export default async function Events({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'EventsPage' });

  const supabase = await createClient();

  const { data: events, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true });

  const upcomingEvents = !error && events ? events : [];
  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      
      {/* Architectural Header */}
      <header className="mb-20 flex flex-col items-start border-l-8 border-auib-red pl-6 md:pl-10">
        <h1 className="text-5xl md:text-7xl font-bold text-auib-charcoal mb-6 uppercase tracking-tight leading-none">
          {t('pageTitle')}
        </h1>
        <p className="text-xl md:text-3xl text-auib-charcoal/90 max-w-3xl leading-relaxed font-medium">
          {t('pageSubtitle')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="w-full h-1.5 bg-auib-charcoal mb-20"></div>

      <div className="space-y-12">
        {upcomingEvents.length === 0 ? (
            <p className="text-xl font-bold uppercase tracking-widest text-auib-charcoal/70">
                {isAr ? 'لا توجد أحداث قادمة حالياً.' : 'No upcoming events at this time.'}
            </p>
        ) : upcomingEvents.map((event) => (
          <article key={event.id} className="group flex flex-col md:flex-row bg-white border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] hover:shadow-[12px_12px_0px_0px_#273237] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
            
            {/* Event Date & Location Block (Brutalist Sidebar) */}
            <div className="md:w-1/3 bg-auib-charcoal p-10 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-6">
                 <Calendar className="text-auib-red w-8 h-8" />
                 <span className="text-white font-bold text-2xl uppercase tracking-wider">
                    {new Date(event.starts_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                 </span>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="text-white/60 w-6 h-6" />
                <span className="text-sm font-bold text-white/80 uppercase tracking-widest">
                  {event.location}
                </span>
              </div>
            </div>

            {/* Event Details */}
            <div className="md:w-2/3 p-10 flex flex-col justify-center bg-white border-t-4 md:border-t-0 md:border-l-4 rtl:md:border-l-0 rtl:md:border-r-4 border-auib-charcoal relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-auib-red scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top rtl:left-auto rtl:right-0"></div>
              
              <h2 className="text-3xl font-bold mb-4 text-auib-charcoal uppercase tracking-wide leading-tight group-hover:text-auib-red transition-colors">
                  {isAr ? event.title_ar : event.title_en}
              </h2>
              <p className="text-lg leading-relaxed text-auib-charcoal font-medium">
                  {isAr ? event.description_ar : event.description_en}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
