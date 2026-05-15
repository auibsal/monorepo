import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';

export const revalidate = 3600; // Prevent caching

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
          getAll() { return cookieStore.getAll(); }
      }
  });

  const { data: post, error } = await supabase.from('blog_posts').select('*, users(full_name)').eq('slug', slug).single();

  if (error || !post) {
      notFound();
  }

  const isAr = locale === 'ar';
  const content = isAr ? post.content_ar : post.content_en;

  const cleanHTML = DOMPurify.sanitize(content);

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-12">
        <Link href={`/${locale}/blog`} className="text-auib-red font-bold uppercase tracking-widest text-sm hover:underline flex items-center gap-2">
           &larr; {isAr ? 'العودة إلى المدونة' : 'Back to Blog'}
        </Link>
      </div>

      <header className="mb-16 border-b-2 border-auib-charcoal/10 pb-12">
        <h1 className="text-4xl md:text-6xl font-black text-auib-charcoal mb-8 tracking-tight leading-tight">
          {isAr ? post.title_ar : post.title_en}
        </h1>

        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-auib-charcoal/5 rounded-full flex items-center justify-center text-auib-charcoal font-bold text-lg">
                {(post as any).users?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
                <p className="text-base font-bold text-auib-charcoal">{(post as any).users?.full_name || 'Unknown Author'}</p>
                <p className="text-sm font-mono text-auib-charcoal/60">
                    {new Date(post.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
      </header>

      {/* Render tip-tap HTML output directly with prose styles */}
      <div
        className="prose prose-lg md:prose-xl max-w-none text-auib-charcoal leading-relaxed prose-headings:font-bold prose-headings:text-auib-charcoal prose-a:text-auib-red prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
      />
    </div>
  );
}
