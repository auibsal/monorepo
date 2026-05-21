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

  // ⚡ Bolt Performance Optimization + Security Fix: Shielding unpublished drafts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title_en, title_ar, published_at, users(full_name)')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });

  const blogPosts = !error && posts ? posts : [];
  const isAr = locale === 'ar';

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      
      {/* Architectural Header */}
      <header className="mb-20 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 uppercase tracking-tight leading-none">
          {t('title')}
        </h1>
        <p className="text-xl md:text-3xl text-foreground/90 max-w-3xl leading-relaxed font-medium">
          {t('subtitle')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="w-full h-1.5 bg-foreground mb-20"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {blogPosts.length === 0 ? (
             <p className="text-xl font-bold uppercase tracking-widest text-foreground/70 col-span-full">
                {/* Fallback to t() block to enforce next-intl parity */}
                {t('noPosts') || (isAr ? 'لا توجد مقالات منشورة حالياً.' : 'No blog posts published yet.')}
             </p>
        ) : blogPosts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group h-full">
             <article className="h-full flex flex-col bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
                <div className="p-8 flex-1 flex flex-col">
                    
                    {/* Brutalist Author Block mapped to semantic foreground/background tokens */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-border">
                        <div className="w-12 h-12 bg-foreground flex items-center justify-center text-background font-bold border-2 border-transparent">
                            <User size={24} />
                        </div>
                        <div>
                            {/* Type cast bypassed natively by removing 'any' above, letting Supabase types cascade */}
                            <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                              {/* @ts-expect-error - users relationship may be an array in generic Supabase types depending on generation */}
                              {post.users?.full_name || 'Unknown Author'}
                            </p>
                            <p className="text-xs font-bold text-primary">
                                {new Date(post.published_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-6 text-foreground uppercase tracking-wide leading-tight group-hover:text-primary transition-colors line-clamp-3">
                        {isAr ? post.title_ar : post.title_en}
                    </h2>

                    <div className="mt-auto pt-6 flex items-center text-primary font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform">
                        <span>{t('readArticle') || (isAr ? 'اقرأ المزيد' : 'Read Article')}</span>
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
