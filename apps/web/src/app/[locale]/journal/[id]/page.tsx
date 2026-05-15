import { createClient } from 'auth/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 3600; // Prevent caching

export default async function JournalIssuePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;

  const supabase = await createClient();

  const { data: issue, error } = await supabase.from('journal_issues').select('*').eq('id', id).single();

  if (error || !issue || !issue.file_url) {
      notFound();
  }

  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="mb-8">
        <Link href={`/${locale}/journal`} className="text-auib-red font-bold uppercase tracking-widest text-sm hover:underline flex items-center gap-2">
           &larr; {isAr ? 'العودة إلى المجلة' : 'Back to Journal'}
        </Link>
      </div>

      <header className="mb-12 border-b-2 border-auib-charcoal/10 pb-8">
        <h1 className="text-4xl md:text-6xl font-black text-auib-charcoal mb-4 tracking-tight">
          {isAr ? issue.title_ar : issue.title_en}
        </h1>
        <div className="flex gap-4 items-center">
            <span className="inline-block px-4 py-1.5 bg-auib-charcoal text-auib-white text-xs font-bold uppercase tracking-widest rounded-none">
              Vol. {issue.volume_number}, Issue {issue.issue_number}
            </span>
            <span className="text-sm font-mono text-auib-charcoal/60">
                {new Date(issue.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long' })}
            </span>
        </div>
      </header>

      <div className="bg-auib-charcoal p-2 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] h-[80vh] w-full">
         <iframe src={issue.file_url} className="w-full h-full bg-white" title={isAr ? issue.title_ar : issue.title_en} />
      </div>
    </div>
  );
}
