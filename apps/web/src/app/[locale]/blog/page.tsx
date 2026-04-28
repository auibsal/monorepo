'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@repo/supabase/client';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export default function BlogList() {
  const [curations, setCurations] = useState<any[]>([]);
  const supabase = createClient();
  const t = useTranslations('Navigation'); // Reusing the translation you already have

  useEffect(() => {
    async function fetchCurations() {
      const { data } = await supabase
        .from('curations')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (data) setCurations(data);
    }
    fetchCurations();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 pt-32 px-8 md:px-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-16">
          {t('blog')} <span className="text-amber-500 italic font-serif text-2xl md:text-4xl lowercase absolute ml-4 mt-2">archive</span>
        </h1>

        <div className="flex flex-col gap-8">
          {curations.map((post, index) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/blog/${post.slug}`} className="group block border-b border-zinc-900 pb-8 hover:border-amber-500/50 transition-colors">
                <p className="text-xs text-zinc-500 tracking-[0.2em] mb-3">
                  {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <h2 className="text-2xl font-bold uppercase group-hover:text-amber-500 transition-colors">{post.title}</h2>
                {post.excerpt && <p className="mt-3 text-zinc-400 text-sm leading-relaxed">{post.excerpt}</p>}
              </Link>
            </motion.div>
          ))}
          
          {curations.length === 0 && (
            <p className="text-xs uppercase tracking-widest text-zinc-600">No curations published yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
