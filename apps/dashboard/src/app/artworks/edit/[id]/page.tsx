'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@repo/supabase/client';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';

export default function EditArtwork({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({ title: '', artist: '', description: '', audio_url: '', language: 'both' });

  useEffect(() => {
    async function fetchArtwork() {
      const response = await supabase.from('artworks' as any).select('*').eq('id', resolvedParams.id).single();
      const data = response.data as any;
      if (data) setForm({ title: data.title, artist: data.artist, description: data.description, audio_url: data.audio_url || '', language: data.language || 'both' });
      setLoading(false);
    }
    fetchArtwork();
  }, [resolvedParams.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `artworks/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('museum-assets').upload(filePath, file);
    
    if (uploadError) {
      alert('Upload error: ' + uploadError.message);
    } else {
      const { data } = supabase.storage.from('museum-assets').getPublicUrl(filePath);
      setForm({ ...form, audio_url: data.publicUrl });
    }
    setUploading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('artworks' as any).update(form).eq('id', resolvedParams.id);
    setSaving(false);
    if (!error) router.push('/artworks');
    else alert("Error: " + error.message);
  }

  if (loading) return <div className="min-h-screen bg-zinc-100 flex justify-center items-center text-amber-600 font-bold tracking-widest uppercase">Loading...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-zinc-100">
      <Navigation />
      <main className="flex-1 md:ml-64 p-6 md:p-12">
        <div className="max-w-3xl mx-auto bg-white border border-zinc-300 p-8 shadow-sm">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-8 text-amber-600">Edit Artwork</h1>
          
          <form onSubmit={handleUpdate} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Artwork Title</label>
                <input type="text" dir="auto" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                  className="bg-zinc-50 border border-zinc-300 p-3 text-sm font-bold focus:border-amber-500 outline-none w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Language</label>
                <select value={form.language} onChange={e => setForm({...form, language: e.target.value})} className="bg-zinc-50 border border-zinc-300 p-3 text-sm uppercase outline-none">
                  <option value="both">Both</option><option value="en">English</option><option value="ar">Arabic</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Artist</label>
              <input type="text" dir="auto" value={form.artist} onChange={e => setForm({...form, artist: e.target.value})} required
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm focus:border-amber-500 outline-none w-full" />
            </div>

            <div className="flex flex-col gap-2 border border-zinc-300 p-4 bg-zinc-50">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Update Media Asset</label>
              <input type="file" accept="audio/*,image/*" onChange={handleUpload} disabled={uploading} className="text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-700 hover:file:bg-zinc-300 transition-colors" />
              {uploading && <span className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-2">Uploading to storage...</span>}
              <input type="text" value={form.audio_url} onChange={e => setForm({...form, audio_url: e.target.value})} placeholder="Or paste a direct URL here..."
                className="mt-2 bg-white border border-zinc-300 p-3 text-sm lowercase focus:border-amber-500 outline-none w-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500">Curatorial Description</label>
              <textarea dir="auto" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={8}
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm focus:border-amber-500 outline-none w-full leading-relaxed" />
            </div>

            <div className="flex gap-4 mt-4">
              <button type="button" onClick={() => router.push('/artworks')} className="flex-1 border border-zinc-300 py-4 uppercase text-xs tracking-widest font-bold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving || uploading} className="flex-1 bg-amber-500 text-white py-4 uppercase text-xs tracking-widest font-bold hover:bg-amber-400 transition-colors disabled:opacity-50">
                {saving ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
