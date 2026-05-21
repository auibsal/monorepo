import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@auibsal/auth/server';

// Added translation import

// CRITICAL: 0 completely prevents caching to ensure live updates.
export const revalidate = 0;

export default async function JournalIssuePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'JournalPage' });

  const supabase = await createClient();

  // CRITICAL FIX: Chained .not() to prevent direct-link bypass for unpublished drafts
  const { data: issue, error } = await supabase
    .from('journal_issues')
    .select('*')
    .eq('id', id)
    .not('published_at', 'is', null)
    .single();

  if (error || !issue || !issue.file_url) {
    notFound();
  }

  const isAr = locale === 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      {/* Brutalist Back Navigation mapped to semantic variables */}
      <div className="mb-16">
        <Link
          href="/journal"
          className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-transform hover:-translate-x-1 rtl:hover:translate-x-1"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          {/* Fallback pattern ensuring parity with next-intl */}
          {t('backToJournal') || (isAr ? 'العودة إلى المجلة' : 'Back to Journal')}
        </Link>
      </div>

      {/* Architectural Header */}
      <header className="border-border mb-16 border-b-4 pb-12">
        <h1 className="text-foreground mb-8 text-4xl font-bold uppercase leading-none tracking-tight md:text-6xl">
          {isAr ? issue.title_ar : issue.title_en}
        </h1>
        <div className="flex items-center gap-4">
          {/* Semantic inversion for dark mode contrast */}
          <span className="bg-foreground text-background inline-block border-2 border-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest">
            Vol. {issue.volume_number}, Issue {issue.issue_number}
          </span>
          <span className="text-primary text-sm font-bold uppercase tracking-widest">
            {new Date(issue.published_at).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
      </header>

      {/* Brutalist PDF Viewer Frame anchored to dark mode tokens */}
      <div className="bg-card border-border h-[80vh] w-full border-4 p-2 shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
        <iframe
          src={issue.file_url}
          className="border-border h-full w-full border-2"
          title={isAr ? issue.title_ar : issue.title_en}
        />
      </div>
    </div>
  );
}
