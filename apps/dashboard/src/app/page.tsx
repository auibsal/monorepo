'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@repo/supabase/client';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import { Edit2, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardCurations() {
  const [curations, setCurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('en');

  useEffect(() => { fetchCurations(); }, []);

  async function fetchCurations() {
    const { data } = await supabase.from('curations' as any).select('*').order('created_at', { ascending: false });
    if (data) setCurations(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('curations' as any).insert([{ title, slug, content, language, published: false }]);
    if (!error) { setTitle(''); setSlug(''); setContent(''); fetchCurations(); } 
    else alert("Error: " + error.message);
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this curation?')) {
      await supabase.from('curations' as any).delete().eq('id', id);
      fetchCurations();
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans">
      <Navigation />
      
      <main className="flex-1 md:ml-64 p-6 md:p-12">
        <h1 className="text-3xl font-black uppercase tracking-widest mb-10 text-amber-600">Curations Control</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* CREATE FORM */}
          <div className="bg-white border border-zinc-300 p-6 md:p-8 shadow-sm">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-6">Draft New Curation</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <input type="text" placeholder="TITLE" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} required
                  className="flex-1 bg-zinc-50 border border-zinc-300 p-3 text-xs font-bold focus:border-amber-500 outline-none" />
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-zinc-50 border border-zinc-300 p-3 text-xs uppercase outline-none">
                  <option value="en">ENG</option>
                  <option value="ar">ARA</option>
                  <option value="both">BOTH</option>
                </select>
              </div>
              <input type="text" placeholder="SLUG (e.g., my-post)" value={slug} onChange={(e) => setSlug(e.target.value)} required
                className="bg-zinc-50 border border-zinc-300 p-3 text-xs lowercase tracking-wider focus:border-amber-500 outline-none" />
              <textarea placeholder="CONTENT (Supports Arabic & English)" dir="auto" value={content} onChange={(e) => setContent(e.target.value)} required rows={6}
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm focus:border-amber-500 outline-none leading-relaxed" />
              <button type="submit" className="bg-amber-500 text-white font-bold uppercase tracking-widest text-xs py-4 hover:bg-amber-400 transition-colors">
                Save Draft
              </button>
            </form>
          </div>

          {/* LIST VIEW */}
          <div>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-6">Database Archive</h2>
            {loading ? <p className="text-xs text-amber-500 uppercase tracking-widest">Loading...</p> : (
              <div className="flex flex-col gap-4">
                {curations.map(post => (
                  <div key={post.id} className="bg-white border border-zinc-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 overflow-hidden" dir="auto">
                      <h3 className="font-bold text-lg truncate">{post.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] uppercase font-mono bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-1">{post.language}</span>
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${post.published ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link href={`/edit/${post.id}`} className="p-2 border border-zinc-300 hover:bg-zinc-100 transition-colors">
                        <Edit2 size={16} className="text-zinc-600" />
                      </Link>
                      <button onClick={() => handleDelete(post.id)} className="p-2 border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
