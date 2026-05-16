import { createClient } from '@auibsal/auth/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import DOMPurify from 'isomorphic-dompurify';
import { ArrowLeft, User } from 'lucide-react';

// CRITICAL: 0 completely prevents caching to ensure editors see live updates.
export const revalidate = 0; 

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;

  const supabase = await createClient();

  const { data: post, error } = await supabase.from('blog_posts').select('*, users(full_name)').eq('slug', slug).single();

  if (error || !post) {
      notFound();
  }

  const isAr = locale === 'ar';
  const content = isAr ? post.content_ar : post.content_en;

  const cleanHTML = DOMPurify.sanitize(content);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-32">
      
      {/* Brutalist Back Navigation */}
      <div className="mb-16">
        <Link 
          href="/blog" 
          className="inline-flex items-center gap-2 text-auib-charcoal font-bold uppercase tracking-widest text-sm hover:text-auib-red hover:-translate-x-1 rtl:hover:translate-x-1 transition-transform"
        >
           <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
           {isAr ? 'العودة إلى المدونة' : 'Back to Blog'}
        </Link>
      </div>

      {/* Architectural Article Header */}
      <header className="mb-16 border-b-4 border-auib-charcoal pb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-auib-charcoal mb-10 uppercase tracking-tight leading-none">
          {isAr ? post.title_ar : post.title_en}
        </h1>

        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-auib-charcoal flex items-center justify-center text-white font-bold border-2 border-transparent">
                <User size={24} />
            </div>
            <div>
                <p className="text-sm font-bold uppercase tracking-wider text-auib-charcoal">{(post as any).users?.full_name || 'Unknown Author'}</p>
                <p className="text-xs font-bold text-auib-red">
                    {new Date(post.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
      </header>

      {/* Brutalist Prose Container */}
      <div
        className="prose prose-lg md:prose-xl max-w-none text-auib-charcoal font-medium leading-relaxed prose-headings:font-bold prose-headings:text-auib-charcoal prose-headings:uppercase prose-headings:tracking-tight prose-a:text-auib-red prose-a:underline prose-a:underline-offset-4 prose-a:decoration-2 hover:prose-a:text-auib-charcoal"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
      />
    </div>
  );
}
