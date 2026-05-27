import { createClient } from '@auibsal/auth/server';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

// 1. CRITICAL PERFORMANCE UPGRADE: Incremental Static Regeneration (ISR)
// Caches the page globally for 1 hour to ensure instant page transitions.
export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: 'en' | 'ar'; id: string }>;
};

// 2. Dynamic SEO Injection
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: issue } = await supabase
    .from('journal_issues')
    .select('title_en, title_ar, volume_number, issue_number')
    .eq('id', id)
    .single();

  if (!issue) return {};

  const title = locale === 'ar' ? issue.title_ar : issue.title_en;

  return {
    title: `${title} | Vol. ${issue.volume_number}, Issue ${issue.issue_number}`,
    description: `Read the official publication of the AUIB Society of Arts and Letters.`,
    openGraph: {
      title: `${title} | AUIB SAL Journal`,
      description: `Volume ${issue.volume_number}, Issue ${issue.issue_number}`,
    },
  };
}

// 3. Strictly typed component parameters
export default async function JournalIssuePage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'JournalPage' });

  const supabase = await createClient();

  // Ensure unpublished drafts cannot be accessed via direct link
  const { data: issue, error } = await supabase
    .from('journal_issues')
    .select('*')
    .eq('id', id)
    .not('published_at', 'is', null)
    .single();

  if (error || !issue || !issue.pdf_file_url) {
    notFound();
  }

  const isAr = locale === 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      {/* Brutalist Back Navigation mapped to semantic variables */}
      <div className="mb-16">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-sm font-bold tracking-widest text-foreground uppercase transition-transform hover:-translate-x-1 hover:text-primary rtl:hover:translate-x-1"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          {t('backToJournal') || (isAr ? 'العودة إلى المجلة' : 'Back to Journal')}
        </Link>
      </div>

      {/* Architectural Header */}
      <header className="mb-16 border-b-4 border-border pb-12">
        <h1 className="mb-8 text-4xl leading-none font-bold tracking-tight text-foreground uppercase md:text-6xl">
          {isAr ? issue.title_ar : issue.title_en}
        </h1>
        <div className="flex items-center gap-4">
          {/* Semantic inversion for dark mode contrast */}
          <span className="inline-block border-2 border-transparent bg-foreground px-4 py-2 text-xs font-bold tracking-widest text-background uppercase">
            Vol. {issue.volume_number}, Issue {issue.issue_number}
          </span>
          <span className="text-sm font-bold tracking-widest text-primary uppercase">
            {new Date(issue.published_at).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
      </header>

      {/* Brutalist PDF Viewer Frame anchored to dark mode tokens */}
      <div className="h-[80vh] w-full border-4 border-border bg-card p-2 shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
        <iframe
          src={issue.pdf_file_url}
          className="h-full w-full border-2 border-border"
          title={isAr ? issue.title_ar : issue.title_en}
        />
      </div>
    </div>
  );
}
