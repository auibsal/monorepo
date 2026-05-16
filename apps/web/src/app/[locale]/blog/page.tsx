import { getTranslations } from 'next-intl/server';
import { createClient } from '@auibsal/auth/server';
import { Link } from '@/i18n/routing';
import { ArrowRight, User } from 'lucide-react';

// CRITICAL: 0 completely prevents caching. 3600 caches for an hour.
export const revalidate = 0; 

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'BlogPage' });

  const supabase = await createClient();

  const { data: posts, error } = await supabase.from('blog_posts').select('*, users(full_name)').order('published_at', { ascending: false });

  const blogPosts = !error && posts ? posts : [];
  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      
      {/* Architectural Header */}
      <header className="mb-20 flex flex-col items-start border-l-8 border-auib-red pl-6 md:pl-10">
        <h1 className="text-5xl md:text-7xl font-bold text-auib-charcoal mb-6 uppercase tracking-tight leading-none">
          {t('title')}
        </h1>
        <p className="text-xl md:text-3xl text-auib-charcoal/90 max-w-3xl leading-relaxed font-medium">
          {t('subtitle')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="w-full h-1.5 bg-auib-charcoal mb-20"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {blogPosts.length === 0 ? (
             <p className="text-xl font-bold uppercase tracking-widest text-auib-charcoal/70 col-span-full">
                {isAr ? 'لا توجد مقالات منشورة حالياً.' : 'No blog posts published yet.'}
             </p>
        ) : blogPosts.map((post: any) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group h-full">
             <article className="h-full flex flex-col bg-white border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] hover:shadow-[12px_12px_0px_0px_#273237] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
                <div className="p-8 flex-1 flex flex-col">
                    
                    {/* Brutalist Author Block */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-auib-charcoal">
                        <div className="w-12 h-12 bg-auib-charcoal flex items-center justify-center text-white font-bold border-2 border-transparent">
                            <User size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-auib-charcoal">{post.users?.full_name || 'Unknown Author'}</p>
                            <p className="text-xs font-bold text-auib-red">
                                {new Date(post.published_at).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-6 text-auib-charcoal uppercase tracking-wide leading-tight group-hover:text-auib-red transition-colors line-clamp-3">
                        {isAr ? post.title_ar : post.title_en}
                    </h2>

                    <div className="mt-auto pt-6 flex items-center text-auib-red font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform">
                        <span>{isAr ? 'اقرأ المزيد' : 'Read Article'}</span>
                        <ArrowRight className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2 rtl:rotate-180" />
                    </div>
                </div>
             </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
