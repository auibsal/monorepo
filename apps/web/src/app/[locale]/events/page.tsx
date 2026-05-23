import { getTranslations } from 'next-intl/server';
import { createClient } from '@auibsal/auth/server';
import { Calendar, MapPin } from 'lucide-react';

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
      
      <header className="mb-20 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 uppercase tracking-tight leading-none">
          {t('pageTitle')}
        </h1>
        <p className="text-xl md:text-3xl text-foreground/90 max-w-3xl leading-relaxed font-medium">
          {t('pageSubtitle')}
        </p>
      </header>

      <div className="w-full h-1.5 bg-foreground mb-20"></div>

      <div className="space-y-12">
        {upcomingEvents.length === 0 ? (
            <p className="text-xl font-bold uppercase tracking-widest text-foreground/70">
                {t('noEvents')} {/* Mapped to translation file for better practice */}
            </p>
        ) : upcomingEvents.map((event) => (
          <article key={event.id} className="group flex flex-col md:flex-row bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
            
            {/* Sidebar now uses primary background for contrast */}
            <div className="md:w-1/3 bg-foreground p-10 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-6">
                 <Calendar className="text-primary w-8 h-8" />
                 <span className="text-background font-bold text-2xl uppercase tracking-wider">
                    {new Date(event.starts_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                 </span>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="text-background/60 w-6 h-6" />
                <span className="text-sm font-bold text-background/80 uppercase tracking-widest">
                  {event.location}
                </span>
              </div>
            </div>

            <div className="md:w-2/3 p-10 flex flex-col justify-center bg-card border-t-4 md:border-t-0 md:border-l-4 rtl:md:border-l-0 rtl:md:border-r-4 border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top rtl:left-auto rtl:right-0"></div>
              
              <h2 className="text-3xl font-bold mb-4 text-foreground uppercase tracking-wide leading-tight group-hover:text-primary transition-colors">
                  {isAr ? event.title_ar : event.title_en}
              </h2>
              <p className="text-lg leading-relaxed text-foreground font-medium">
                  {isAr ? event.description_ar : event.description_en}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
