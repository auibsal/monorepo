import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@auibsal/auth/server';

// 1. CRITICAL PERFORMANCE UPGRADE: Incremental Static Regeneration (ISR)
// Caches the page globally for 1 hour. This eliminates redundant Supabase reads 
// and delivers lightning-fast load times while still staying relatively live.
export const revalidate = 3600;

// 2. Strictly typing the locale promise
export default async function Journal({ params }: { params: Promise<{ locale: 'en' | 'ar' }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'JournalPage' });

  const supabase = await createClient();

  // Ensure unpublished drafts are completely hidden from the public query
  const { data: issues, error } = await supabase
    .from('journal_issues')
    .select('id, volume_number, issue_number, published_at, title_en, title_ar')
    .not('published_at', 'is', null)
    .order('volume_number', { ascending: false })
    .order('issue_number', { ascending: false });

  const publishedIssues = !error && issues ? issues : [];
  const isAr = locale === 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      {/* Architectural Header */}
      <header className="mb-20 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        <h1 className="mb-6 text-5xl leading-none font-bold tracking-tight text-foreground uppercase md:text-7xl">
          {t('journalName')}
        </h1>
        <p className="mb-8 text-2xl font-bold tracking-widest text-primary uppercase md:text-3xl">
          {t('journalSubtitle')}
        </p>
        <p className="max-w-3xl text-xl leading-relaxed font-medium text-foreground/90 md:text-3xl">
          {t('journalIntro')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="mb-20 h-1.5 w-full bg-foreground"></div>

      <div className="space-y-12">
        {publishedIssues.length === 0 ? (
          <p className="text-xl font-bold tracking-widest text-foreground/70 uppercase">
            {t('noIssues')}
          </p>
        ) : (
          publishedIssues.map((issue) => (
            <Link key={issue.id} href={`/journal/${issue.id}`} className="group block">
              {/* Replaced hardcoded hexes with semantic tokens for seamless dark mode compatibility */}
              <article className="relative overflow-hidden border-4 border-border bg-card p-10 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:p-14">
                {/* Hover Accent mapped to the primary brand color */}
                <div className="absolute top-0 left-0 h-full w-2 origin-top scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100 rtl:right-0 rtl:left-auto"></div>

                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  {/* Dark contrasting tag using foreground background and background text */}
                  <span className="inline-block w-fit border-2 border-transparent bg-foreground px-4 py-2 text-xs font-bold tracking-widest text-background uppercase">
                    Vol. {issue.volume_number}, Issue {issue.issue_number}
                  </span>
                  <span className="text-sm font-bold tracking-widest text-foreground/80 uppercase">
                    {new Date(issue.published_at).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>

                <h3 className="mt-2 mb-10 text-4xl leading-tight font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary md:text-5xl">
                  {isAr ? issue.title_ar : issue.title_en}
                </h3>

                <div className="flex items-center text-sm font-bold tracking-widest text-primary uppercase transition-transform group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                  <span>{t('readMore')}</span>
                  <ArrowRight className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
