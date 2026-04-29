'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@repo/supabase/client';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';

export default function BlogList() {
  const [curations, setCurations] = useState<any[]>([]);
  const supabase = createClient();
  const locale = useLocale();

  useEffect(() => {
    async function fetchCurations() {
      const { data } = await supabase
        .from('curations' as any)
        .select('*')
        .eq('published', true)
        .in('language', [locale, 'both'])
        .order('created_at', { ascending: false });
      if (data) setCurations(data);
    }
    fetchCurations();
  }, [locale]);

  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#111111] pt-32 px-6 md:px-12 pb-24">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-24"
        >
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter">
            Curations
          </h1>
          <p className="mt-4 text-sm text-zinc-500 uppercase tracking-widest max-w-md">
            Essays, thoughts, and editorial documentation from the curator's desk.
          </p>
        </motion.div>

        <div className="flex flex-col border-t border-zinc-300">
          {curations.map((post, index) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/blog/${post.slug}`} className="group flex flex-col md:flex-row md:items-center justify-between py-12 border-b border-zinc-300 hover:px-6 transition-all duration-500 ease-out">
                <div className="flex-1 pr-8">
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em] mb-4">
                    {new Date(post.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter group-hover:text-amber-600 transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h2>
                </div>
                <div className="mt-6 md:mt-0 md:w-1/3 flex items-center justify-between md:justify-end gap-8">
                  {post.excerpt && <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 max-w-xs hidden md:block">{post.excerpt}</p>}
                  <div className="w-10 h-10 rounded-full border border-zinc-300 flex items-center justify-center group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white transition-colors duration-300">
                    →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          
          {curations.length === 0 && (
            <p className="py-12 text-xs uppercase tracking-widest text-zinc-500 text-center">No curations published for this region yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
