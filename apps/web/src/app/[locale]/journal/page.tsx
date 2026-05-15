import { getTranslations } from 'next-intl/server';
import { createClient } from 'auth/server';
import Link from 'next/link';

export const revalidate = 3600; // Prevent caching

export default async function Journal({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'JournalPage' });

  const supabase = await createClient();

  const { data: issues, error } = await supabase.from('journal_issues').select('*').order('volume_number', { ascending: false }).order('issue_number', { ascending: false });

  const publishedIssues = !error && issues ? issues : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <header className=" mb-24 border-b-2 border-auib-charcoal/10 pb-16 relative">
        <div className="absolute top-0 start-0 w-32 h-32 bg-auib-red/5 rounded-full blur-3xl -z-10"></div>
        <h1 className="text-6xl md:text-8xl font-black text-auib-charcoal mb-6 tracking-tight">
          {t('journalName')}
        </h1>
        <p className="text-2xl text-auib-red font-medium mb-10 tracking-wide">
          {t('journalSubtitle')}
        </p>
        <div className="w-16 h-1 bg-auib-charcoal/20 mb-10"></div>
        <p className="text-xl leading-relaxed max-w-2xl text-auib-charcoal/80">
          {t('journalIntro')}
        </p>
      </header>

      <div className="space-y-20">
        {publishedIssues.length === 0 ? (
             <p className="text-xl text-auib-charcoal/70">{locale === 'ar' ? 'لا توجد إصدارات منشورة حالياً.' : 'No published issues yet.'}</p>
        ) : publishedIssues.map(issue => (
            <Link key={issue.id} href={`/${locale}/journal/${issue.id}`}>
                <article className="group cursor-pointer relative bg-white p-10 md:p-14 rounded-xl shadow-sm border border-auib-charcoal/5 hover:shadow-2xl hover:border-auib-red/20 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-auib-red/0 via-auib-red to-auib-red/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <span className="inline-block px-4 py-1.5 bg-auib-charcoal/5 text-auib-charcoal text-xs font-bold uppercase tracking-widest rounded-full w-fit">
                    Vol. {issue.volume_number}, Issue {issue.issue_number}
                    </span>
                    <span className="text-sm text-auib-charcoal/60 italic">
                        {new Date(issue.published_at).toLocaleDateString(locale === 'ar' ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long' })}
                    </span>
                </div>

                <h3 className="text-4xl md:text-5xl font-bold mt-2 text-auib-charcoal group-hover:text-auib-red transition-colors mb-6 leading-tight">
                    {locale === 'ar' ? issue.title_ar : issue.title_en}
                </h3>

                <div className="flex items-center text-auib-red font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                    <span>{t('readMore')}</span>
                    <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
                </article>
            </Link>
        ))}
      </div>
    </div>
  );
}
