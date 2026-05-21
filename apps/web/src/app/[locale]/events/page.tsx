import { Calendar, MapPin } from 'lucide-react';
import { useFormatter } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@auibsal/auth/server';

// Using the formatter for better date handling

export const revalidate = 0;

export default async function Events({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'EventsPage' });
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true });
  const upcomingEvents = !error && events ? events : [];
  const isAr = locale === 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      <header className="border-primary mb-20 flex flex-col items-start border-l-8 pl-6 md:pl-10">
        <h1 className="text-foreground mb-6 text-5xl font-bold uppercase leading-none tracking-tight md:text-7xl">
          {t('pageTitle')}
        </h1>
        <p className="text-foreground/90 max-w-3xl text-xl font-medium leading-relaxed md:text-3xl">
          {t('pageSubtitle')}
        </p>
      </header>

      <div className="bg-foreground mb-20 h-1.5 w-full"></div>

      <div className="space-y-12">
        {upcomingEvents.length === 0 ? (
          <p className="text-foreground/70 text-xl font-bold uppercase tracking-widest">
            {t('noEvents')} {/* Mapped to translation file for better practice */}
          </p>
        ) : (
          upcomingEvents.map((event) => (
            <article
              key={event.id}
              className="bg-card border-border group flex flex-col border-4 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:flex-row"
            >
              {/* Sidebar now uses primary background for contrast */}
              <div className="bg-foreground flex flex-col justify-center p-10 md:w-1/3">
                <div className="mb-6 flex items-center gap-4">
                  <Calendar className="text-primary h-8 w-8" />
                  <span className="text-background text-2xl font-bold uppercase tracking-wider">
                    {new Date(event.starts_at).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <MapPin className="text-background/60 h-6 w-6" />
                  <span className="text-background/80 text-sm font-bold uppercase tracking-widest">
                    {event.location}
                  </span>
                </div>
              </div>

              <div className="bg-card border-border relative flex flex-col justify-center overflow-hidden border-t-4 p-10 md:w-2/3 md:border-l-4 md:border-t-0 rtl:md:border-l-0 rtl:md:border-r-4">
                <div className="bg-primary absolute left-0 top-0 h-full w-2 origin-top scale-y-0 transition-transform duration-200 group-hover:scale-y-100 rtl:left-auto rtl:right-0"></div>

                <h2 className="text-foreground group-hover:text-primary mb-4 text-3xl font-bold uppercase leading-tight tracking-wide transition-colors">
                  {isAr ? event.title_ar : event.title_en}
                </h2>
                <p className="text-foreground text-lg font-medium leading-relaxed">
                  {isAr ? event.description_ar : event.description_en}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
