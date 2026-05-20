import { getTranslations } from 'next-intl/server';
import { createClient } from '@auibsal/auth/server';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

// CRITICAL: 0 completely prevents caching to ensure live journal updates.
export const revalidate = 0; 

export default async function Journal({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'JournalPage' });

  const supabase = await createClient();

  // ⚡ Bolt Performance Optimization: Explicitly select only required fields to prevent over-fetching
  const { data: issues, error } = await supabase.from('journal_issues').select('id, volume_number, issue_number, published_at, title_en, title_ar').order('volume_number', { ascending: false }).order('issue_number', { ascending: false });

  const publishedIssues = !error && issues ? issues : [];
  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      
      {/* Architectural Header */}
      <header className="mb-20 flex flex-col items-start border-l-8 border-auib-red pl-6 md:pl-10">
        <h1 className="text-5xl md:text-7xl font-bold text-auib-charcoal mb-6 uppercase tracking-tight leading-none">
          {t('journalName')}
        </h1>
        <p className="text-2xl md:text-3xl text-auib-red font-bold mb-8 uppercase tracking-widest">
          {t('journalSubtitle')}
        </p>
        <p className="text-xl md:text-3xl text-auib-charcoal/90 max-w-3xl leading-relaxed font-medium">
          {t('journalIntro')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="w-full h-1.5 bg-auib-charcoal mb-20"></div>

      <div className="space-y-12">
        {publishedIssues.length === 0 ? (
             <p className="text-xl font-bold uppercase tracking-widest text-auib-charcoal/70">
                {isAr ? 'لا توجد إصدارات منشورة حالياً.' : 'No published issues yet.'}
             </p>
        ) : publishedIssues.map(issue => (
            <Link key={issue.id} href={`/journal/${issue.id}`} className="group block">
                <article className="relative bg-white p-10 md:p-14 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] hover:shadow-[12px_12px_0px_0px_#273237] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200 overflow-hidden">
                
                {/* Hover Accent */}
                <div className="absolute top-0 left-0 w-2 h-full bg-auib-red scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-top rtl:left-auto rtl:right-0"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <span className="inline-block bg-auib-charcoal text-white px-4 py-2 text-xs font-bold uppercase tracking-widest w-fit border-2 border-transparent">
                    Vol. {issue.volume_number}, Issue {issue.issue_number}
                    </span>
                    <span className="text-sm font-bold text-auib-charcoal/80 uppercase tracking-widest">
                        {new Date(issue.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long' })}
                    </span>
                </div>

                <h3 className="text-4xl md:text-5xl font-bold mt-2 text-auib-charcoal uppercase tracking-wide leading-tight group-hover:text-auib-red transition-colors mb-10">
                    {isAr ? issue.title_ar : issue.title_en}
                </h3>

                <div className="flex items-center text-auib-red font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform">
                    <span>{t('readMore')}</span>
                    <ArrowRight className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2 rtl:rotate-180" />
                </div>
                </article>
            </Link>
        ))}
      </div>
    </div>
  );
}
