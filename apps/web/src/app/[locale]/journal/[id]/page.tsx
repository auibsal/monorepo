import { createClient } from '@auibsal/auth/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';

// CRITICAL: 0 completely prevents caching to ensure live updates.
export const revalidate = 0; 

export default async function JournalIssuePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;

  const supabase = await createClient();

  const { data: issue, error } = await supabase.from('journal_issues').select('*').eq('id', id).single();

  if (error || !issue || !issue.file_url) {
      notFound();
  }

  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      
      {/* Brutalist Back Navigation */}
      <div className="mb-16">
        <Link 
          href="/journal" 
          className="inline-flex items-center gap-2 text-auib-charcoal font-bold uppercase tracking-widest text-sm hover:text-auib-red hover:-translate-x-1 rtl:hover:translate-x-1 transition-transform"
        >
           <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
           {isAr ? 'العودة إلى المجلة' : 'Back to Journal'}
        </Link>
      </div>

      {/* Architectural Header */}
      <header className="mb-16 border-b-4 border-auib-charcoal pb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-auib-charcoal mb-8 uppercase tracking-tight leading-none">
          {isAr ? issue.title_ar : issue.title_en}
        </h1>
        <div className="flex gap-4 items-center">
            <span className="inline-block bg-auib-charcoal text-white px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 border-transparent">
              Vol. {issue.volume_number}, Issue {issue.issue_number}
            </span>
            <span className="text-sm font-bold text-auib-red uppercase tracking-widest">
                {new Date(issue.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long' })}
            </span>
        </div>
      </header>

      {/* Brutalist PDF Viewer Frame */}
      <div className="bg-white p-2 border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] h-[80vh] w-full">
         <iframe src={issue.file_url} className="w-full h-full border-2 border-auib-charcoal" title={isAr ? issue.title_ar : issue.title_en} />
      </div>
    </div>
  );
}
