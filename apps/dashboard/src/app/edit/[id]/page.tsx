'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@repo/supabase/client';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';

export default function EditCuration({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: '', slug: '', content: '', excerpt: '', language: 'en', published: false });

  useEffect(() => {
    async function fetchPost() {
      const response = await supabase.from('curations' as any).select('*').eq('id', resolvedParams.id).single();
      const data = response.data as any;
      if (data) setForm({ title: data.title, slug: data.slug, content: data.content, excerpt: data.excerpt || '', language: data.language || 'en', published: data.published });
      setLoading(false);
    }
    fetchPost();
  }, [resolvedParams.id]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('curations' as any).update(form).eq('id', resolvedParams.id);
    setSaving(false);
    if (!error) router.push('/');
    else alert("Error: " + error.message);
  }

  if (loading) return <div className="min-h-screen bg-zinc-100 flex justify-center items-center text-amber-600 font-bold tracking-widest uppercase">Loading...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-zinc-100">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-12">
        <div className="max-w-3xl mx-auto bg-white border border-zinc-300 p-8 shadow-sm">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-8 text-amber-600">Edit Curation</h1>
          
          <form onSubmit={handleUpdate} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Title</label>
                <input type="text" dir="auto" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                  className="bg-zinc-50 border border-zinc-300 p-3 text-sm font-bold focus:border-amber-500 outline-none w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Language</label>
                <select value={form.language} onChange={e => setForm({...form, language: e.target.value})} className="bg-zinc-50 border border-zinc-300 p-3 text-sm uppercase outline-none">
                  <option value="en">English</option><option value="ar">Arabic</option><option value="both">Both</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Slug (URL)</label>
              <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm lowercase focus:border-amber-500 outline-none w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Excerpt (Optional Summary)</label>
              <textarea dir="auto" value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} rows={2}
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm focus:border-amber-500 outline-none w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Main Content</label>
              <textarea dir="auto" value={form.content} onChange={e => setForm({...form, content: e.target.value})} required rows={12}
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm focus:border-amber-500 outline-none w-full leading-relaxed" />
            </div>

            <div className="flex items-center gap-3 border border-zinc-300 p-4 bg-zinc-50">
              <input type="checkbox" id="publish" checked={form.published} onChange={e => setForm({...form, published: e.target.checked})} className="w-4 h-4 accent-amber-500" />
              <label htmlFor="publish" className="text-sm font-bold uppercase tracking-widest cursor-pointer text-zinc-900">Publish to Live Site</label>
            </div>

            <div className="flex gap-4 mt-4">
              <button type="button" onClick={() => router.push('/')} className="flex-1 border border-zinc-300 py-4 uppercase text-xs tracking-widest font-bold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-amber-500 text-white py-4 uppercase text-xs tracking-widest font-bold hover:bg-amber-400 transition-colors disabled:opacity-50">
                {saving ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
