'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@repo/supabase/client';
import { notFound } from 'next/navigation';

export default function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  // Next.js 16 requires unwrapping the params Promise
  const resolvedParams = use(params);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase
        .from('curations')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single();
        
      if (data) {
        setPost(data);
      } else {
        notFound();
      }
      setLoading(false);
    }
    fetchPost();
  }, [resolvedParams.slug]);

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-amber-500 text-xs uppercase tracking-widest">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 pt-32 px-8 md:px-12 pb-24">
      <article className="max-w-2xl mx-auto">
        <header className="mb-16 border-b border-zinc-900 pb-10">
          <p className="text-xs text-amber-500 tracking-[0.2em] mb-4 uppercase">
            {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
            {post.title}
          </h1>
        </header>

        <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-loose">
          {/* For now, rendering raw text. You can swap this for a Markdown parser like 'react-markdown' later */}
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      </article>
    </main>
  );
}
