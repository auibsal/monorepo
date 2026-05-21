import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@auibsal/auth/server';

// CRITICAL: 0 completely prevents caching to ensure live journal updates.
export const revalidate = 0;

export default async function Journal({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'JournalPage' });

  const supabase = await createClient();

  // CRITICAL FIX: Ensure unpublished drafts are completely hidden from the public query
  const { data: issues, error } = await supabase
    .from('journal_issues')
    .select('*')
    .not('published_at', 'is', null)
    .order('volume_number', { ascending: false })
    .order('issue_number', { ascending: false });

  const publishedIssues = !error && issues ? issues : [];
  const isAr = locale === 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      {/* Architectural Header */}
      <header className="border-primary mb-20 flex flex-col items-start border-l-8 pl-6 md:pl-10">
        <h1 className="text-foreground mb-6 text-5xl font-bold uppercase leading-none tracking-tight md:text-7xl">
          {t('journalName')}
        </h1>
        <p className="text-primary mb-8 text-2xl font-bold uppercase tracking-widest md:text-3xl">
          {t('journalSubtitle')}
        </p>
        <p className="text-foreground/90 max-w-3xl text-xl font-medium leading-relaxed md:text-3xl">
          {t('journalIntro')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="bg-foreground mb-20 h-1.5 w-full"></div>

      <div className="space-y-12">
        {publishedIssues.length === 0 ? (
          <p className="text-foreground/70 text-xl font-bold uppercase tracking-widest">
            {/* Ensure you add 'noIssues' to your en.json and ar.json JournalPage object */}
            {t('noIssues') ||
              (isAr ? 'لا توجد إصدارات منشورة حالياً.' : 'No published issues yet.')}
          </p>
        ) : (
          publishedIssues.map((issue) => (
            <Link key={issue.id} href={`/journal/${issue.id}`} className="group block">
              {/* Replaced hardcoded hexes with semantic tokens for seamless dark mode compatibility */}
              <article className="bg-card border-border relative overflow-hidden border-4 p-10 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:p-14">
                {/* Hover Accent mapped to the primary brand color */}
                <div className="bg-primary absolute left-0 top-0 h-full w-2 origin-top scale-y-0 transition-transform duration-200 group-hover:scale-y-100 rtl:left-auto rtl:right-0"></div>

                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  {/* Dark contrasting tag using foreground background and background text */}
                  <span className="bg-foreground text-background inline-block w-fit border-2 border-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest">
                    Vol. {issue.volume_number}, Issue {issue.issue_number}
                  </span>
                  <span className="text-foreground/80 text-sm font-bold uppercase tracking-widest">
                    {new Date(issue.published_at).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>

                <h3 className="text-foreground group-hover:text-primary mb-10 mt-2 text-4xl font-bold uppercase leading-tight tracking-wide transition-colors md:text-5xl">
                  {isAr ? issue.title_ar : issue.title_en}
                </h3>

                <div className="text-primary flex items-center text-sm font-bold uppercase tracking-widest transition-transform group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                  <span>{t('readMore')}</span>
                  <ArrowRight className="ml-2 h-5 w-5 rtl:ml-0 rtl:mr-2 rtl:rotate-180" />
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
