import { createClient } from '@auibsal/auth/server';
import DOMPurify from 'isomorphic-dompurify';
import { ArrowLeft, User } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

// 1. CRITICAL PERFORMANCE UPGRADE: Incremental Static Regeneration (ISR)
// Caches the page globally for 1 hour to ensure instant page transitions.
/**
 * revalidate
 *
 * @description Standardized execution for revalidate.
 */
export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: 'en' | 'ar'; slug: string }>;
};

// 2. Dynamic SEO Injection
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title_en, title_ar, users(full_name)')
    .eq('slug', slug)
    .single();

  if (!post) return {};

  const title = locale === 'ar' ? post.title_ar : post.title_en;
  // Type cast bypassed natively assuming standard joined query object
  const authorName = post.users?.full_name || 'Unknown Author';

  return {
    title: title,
    description: `Read "${title}" by ${authorName} on the AUIB Society of Arts and Letters Blog.`,
    openGraph: {
      title: `${title} | AUIB SAL Blog`,
      description: `An article by ${authorName}.`,
      type: 'article',
    },
  };
}

// 3. Strictly typed component parameters
export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'BlogPage' });

  const supabase = await createClient();

  // The .not() filter prevents direct-slug access to unpublished manuscripts
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*, users(full_name)')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .single();

  if (error || !post) {
    notFound();
  }

  const isAr = locale === 'ar';
  const content = isAr ? post.content_ar : post.content_en;

  const cleanHTML = DOMPurify.sanitize(content);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-32">
      {/* Brutalist Back Navigation using semantic foreground and primary tokens */}
      <div className="mb-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-bold tracking-widest text-foreground uppercase transition-transform hover:-translate-x-1 hover:text-primary rtl:hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          {/* Removed inline fallbacks to enforce strict dictionary adherence */}
          {t('backToBlog')}
        </Link>
      </div>

      {/* Architectural Article Header */}
      <header className="mb-16 border-b-4 border-border pb-12">
        <h1 className="mb-10 text-4xl leading-none font-bold tracking-tight text-foreground uppercase md:text-6xl">
          {isAr ? post.title_ar : post.title_en}
        </h1>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-transparent bg-foreground font-bold text-background">
            <User size={24} />
          </div>
          <div>
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
      </header>

      {/* Brutalist Prose Container */}
      <div
        className="prose prose-lg md:prose-xl prose-headings:font-bold prose-headings:text-foreground prose-headings:uppercase prose-headings:tracking-tight prose-a:text-primary prose-a:underline prose-a:underline-offset-4 prose-a:decoration-2 hover:prose-a:text-foreground max-w-none leading-relaxed font-medium text-foreground"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
      />
    </div>
  );
}
