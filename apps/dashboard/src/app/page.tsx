'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@repo/supabase/client';

export default function DashboardCurations() {
  const [curations, setCurations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchCurations();
  }, []);

  async function fetchCurations() {
    const { data } = await supabase.from('curations').select('*').order('created_at', { ascending: false });
    if (data) setCurations(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('curations').insert([
      { title, slug, content, published: true }
    ]);
    
    if (!error) {
      setTitle(''); setSlug(''); setContent('');
      fetchCurations();
    } else {
      alert("Error creating curation. Check console.");
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-10 font-sans">
      <h1 className="text-3xl font-black uppercase tracking-widest mb-10 text-amber-500">Curations Control</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Create Form */}
        <div className="bg-zinc-900 border border-zinc-800 p-8">
          <h2 className="text-sm uppercase tracking-widest text-zinc-400 mb-6">Draft New Curation</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <input 
              type="text" placeholder="TITLE" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="bg-zinc-950 border border-zinc-800 p-3 text-xs uppercase tracking-wider focus:border-amber-500 outline-none transition-colors"
            />
            <input 
              type="text" placeholder="SLUG (e.g., my-first-post)" value={slug} onChange={(e) => setSlug(e.target.value)} required
              className="bg-zinc-950 border border-zinc-800 p-3 text-xs lowercase tracking-wider focus:border-amber-500 outline-none transition-colors"
            />
            <textarea 
              placeholder="CONTENT (Markdown / Text)" value={content} onChange={(e) => setContent(e.target.value)} required rows={8}
              className="bg-zinc-950 border border-zinc-800 p-3 text-sm focus:border-amber-500 outline-none transition-colors"
            />
            <button type="submit" className="bg-amber-500 text-zinc-950 font-bold uppercase tracking-widest text-xs py-3 mt-2 hover:bg-amber-400 transition-colors">
              Publish Curation
            </button>
          </form>
        </div>

        {/* List View */}
        <div>
          <h2 className="text-sm uppercase tracking-widest text-zinc-400 mb-6">Archive</h2>
          {loading ? (
            <p className="text-xs text-amber-500 uppercase tracking-widest">Loading...</p>
          ) : (
            <div className="flex flex-col gap-4">
              {curations.map(post => (
                <div key={post.id} className="border border-zinc-800 p-5 flex justify-between items-center hover:border-zinc-700 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg">{post.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">{post.slug}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${post.published ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-400'}`}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
