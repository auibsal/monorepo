import { getTranslations } from 'next-intl/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const revalidate = 3600; // Prevent caching

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'BlogPage' });

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
          getAll() { return cookieStore.getAll(); }
      }
  });

  const { data: posts, error } = await supabase.from('blog_posts').select('*, users(full_name)').order('published_at', { ascending: false });

  const blogPosts = !error && posts ? posts : [];
  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <header className="mb-20">
        <h1 className="text-5xl md:text-7xl font-extrabold text-auib-charcoal mb-6 tracking-tight">
          {t('title')}
        </h1>
        <div className="w-24 h-1.5 bg-auib-red mb-8 rounded-full"></div>
        <p className="text-xl md:text-2xl text-auib-charcoal/70 max-w-3xl leading-relaxed font-light">
          {t('subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {blogPosts.length === 0 ? (
             <p className="text-xl text-auib-charcoal/70 col-span-full">{isAr ? 'لا توجد مقالات منشورة حالياً.' : 'No blog posts published yet.'}</p>
        ) : blogPosts.map((post: any) => (
          <Link key={post.id} href={`/${locale}/blog/${post.slug}`}>
             <article className="h-full flex flex-col bg-white border border-auib-charcoal/5 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden group">
                <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-auib-charcoal/5 rounded-full flex items-center justify-center text-auib-charcoal font-bold text-sm">
                            {post.users?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-auib-charcoal">{post.users?.full_name || 'Unknown Author'}</p>
                            <p className="text-xs text-auib-charcoal/60">
                                {new Date(post.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-4 text-auib-charcoal group-hover:text-auib-red transition-colors line-clamp-3 leading-tight">
                        {isAr ? post.title_ar : post.title_en}
                    </h2>

                    <div className="mt-auto pt-6 flex items-center text-auib-red font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                        <span>{isAr ? 'اقرأ المزيد' : 'Read Article'}</span>
                        <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                </div>
             </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
