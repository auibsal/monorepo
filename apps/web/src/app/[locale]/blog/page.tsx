import { Link } from '@/i18n/routing';
import { ArrowRight, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@auibsal/auth/server';

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
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      {/* Architectural Header */}
      <header className="mb-20 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        <h1 className="mb-6 text-5xl leading-none font-bold tracking-tight text-foreground uppercase md:text-7xl">
          {t('title')}
        </h1>
        <p className="max-w-3xl text-xl leading-relaxed font-medium text-foreground/90 md:text-3xl">
          {t('subtitle')}
        </p>
      </header>

      {/* Hard Divider */}
      <div className="mb-20 h-1.5 w-full bg-foreground"></div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
        {blogPosts.length === 0 ? (
          <p className="col-span-full text-xl font-bold tracking-widest text-foreground/70 uppercase">
            {/* Fallback to t() block to enforce next-intl parity */}
            {t('noPosts') ||
              (isAr ? 'لا توجد مقالات منشورة حالياً.' : 'No blog posts published yet.')}
          </p>
        ) : (
          blogPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group h-full">
              <article className="flex h-full flex-col border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
                <div className="flex flex-1 flex-col p-8">
                  {/* Brutalist Author Block mapped to semantic foreground/background tokens */}
                  <div className="mb-8 flex items-center gap-4 border-b-2 border-border pb-6">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-transparent bg-foreground font-bold text-background">
                      <User size={24} />
                    </div>
                    <div>
                      {/* Type cast bypassed natively by removing 'any' above, letting Supabase types cascade */}
                      <p className="text-sm font-bold tracking-wider text-foreground uppercase">
                        {post.users?.full_name || 'Unknown Author'}
                      </p>
                      <p className="text-xs font-bold text-primary">
                        {new Date(post.published_at).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <h2 className="mb-6 line-clamp-3 text-2xl leading-tight font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary">
                    {isAr ? post.title_ar : post.title_en}
                  </h2>

                  <div className="mt-auto flex items-center pt-6 text-sm font-bold tracking-widest text-primary uppercase transition-transform group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                    <span>{t('readArticle') || (isAr ? 'اقرأ المزيد' : 'Read Article')}</span>
                    <ArrowRight className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
