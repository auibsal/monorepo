import { createClient } from '@auibsal/auth/server';
import { Calendar, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

// 1. CRITICAL PERFORMANCE UPGRADE: Incremental Static Regeneration (ISR)
// Caches the page globally for 1 hour for instantaneous loads.
/**
 * revalidate
 *
 * @description Standardized execution for revalidate.
 */
export const revalidate = 3600;

// 2. Strictly typing the locale promise
export default async function Events({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'EventsPage' });
  const supabase = await createClient();

  // 3. LOGICAL FIX: Filter out past events
  const { data: events, error } = await supabase
    .from('events')
    .select('id, starts_at, location, title_ar, title_en, description_ar, description_en')
    .gte('starts_at', new Date().toISOString()) // Only fetch events happening from today onward
    .order('starts_at', { ascending: true });

  const upcomingEvents = !error && events ? events : [];
  const isAr = locale === 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      <header className="mb-20 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        <h1 className="mb-6 text-5xl leading-none font-bold tracking-tight text-foreground uppercase md:text-7xl">
          {t('pageTitle')}
        </h1>
        <p className="max-w-3xl text-xl leading-relaxed font-medium text-foreground/90 md:text-3xl">
          {t('pageSubtitle')}
        </p>
      </header>

      <div className="mb-20 h-1.5 w-full bg-foreground"></div>

      <div className="space-y-12">
        {upcomingEvents.length === 0 ? (
          <p className="text-xl font-bold tracking-widest text-foreground/70 uppercase">
            {t('noEvents')}
          </p>
        ) : (
          upcomingEvents.map((event) => (
            <article
              key={event.id}
              className="group flex flex-col border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:flex-row"
            >
              {/* Sidebar now uses primary background for contrast */}
              <div className="flex flex-col justify-center bg-foreground p-10 md:w-1/3">
                <div className="mb-6 flex items-center gap-4">
                  <Calendar className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-bold tracking-wider text-background uppercase">
                    {new Date(event.starts_at).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <MapPin className="h-6 w-6 text-background/60" />
                  <span className="text-sm font-bold tracking-widest text-background/80 uppercase">
                    {event.location}
                  </span>
                </div>
              </div>

              <div className="relative flex flex-col justify-center overflow-hidden border-t-4 border-border bg-card p-10 md:w-2/3 md:border-t-0 md:border-l-4 rtl:md:border-r-4 rtl:md:border-l-0">
                <div className="absolute top-0 left-0 h-full w-2 origin-top scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100 rtl:right-0 rtl:left-auto"></div>

                <h2 className="mb-4 text-3xl leading-tight font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary">
                  {isAr ? event.title_ar : event.title_en}
                </h2>
                <p className="text-lg leading-relaxed font-medium text-foreground">
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
