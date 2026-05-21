import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import DOMPurify from 'isomorphic-dompurify';
import { ArrowLeft, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@auibsal/auth/server';

// Brought in the translation layer

// CRITICAL: 0 completely prevents caching to ensure live updates.
export const revalidate = 0;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'BlogPage' });

  const supabase = await createClient();

  // CRITICAL FIX: The .not() filter prevents direct-slug access to unpublished manuscripts
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
          className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-transform hover:-translate-x-1 rtl:hover:translate-x-1"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          {t('backToBlog') || (isAr ? 'العودة إلى المدونة' : 'Back to Blog')}
        </Link>
      </div>

      {/* Architectural Article Header */}
      <header className="border-border mb-16 border-b-4 pb-12">
        <h1 className="text-foreground mb-10 text-4xl font-bold uppercase leading-none tracking-tight md:text-6xl">
          {isAr ? post.title_ar : post.title_en}
        </h1>

        <div className="flex items-center gap-4">
          <div className="bg-foreground text-background flex h-12 w-12 items-center justify-center border-2 border-transparent font-bold">
            <User size={24} />
          </div>
          <div>
            {/* Supabase types resolved via standard TS expectation rather than 'any' wiping */}
            <p className="text-foreground text-sm font-bold uppercase tracking-wider">
              {/* @ts-expect-error - Joined relationship type resolution */}
              {post.users?.full_name || 'Unknown Author'}
            </p>
            <p className="text-primary text-xs font-bold">
              {new Date(post.published_at).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Brutalist Prose Container: 
        All custom prose variants (text, headings, links) are perfectly mapped to the foreground 
        and primary CSS variables to guarantee flawless Dark Mode inversion. 
      */}
      <div
        className="prose prose-lg md:prose-xl text-foreground prose-headings:font-bold prose-headings:text-foreground prose-headings:uppercase prose-headings:tracking-tight prose-a:text-primary prose-a:underline prose-a:underline-offset-4 prose-a:decoration-2 hover:prose-a:text-foreground max-w-none font-medium leading-relaxed"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
      />
    </div>
  );
}
