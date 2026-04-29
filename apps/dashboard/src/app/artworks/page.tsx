'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@repo/supabase/client';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import { Edit2, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardArtworks() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState('both');

  useEffect(() => { fetchArtworks(); }, []);

  async function fetchArtworks() {
    const response = await supabase.from('artworks' as any).select('*').order('created_at', { ascending: false });
    const data = response.data as any;
    if (data) setArtworks(data);
    setLoading(false);
  }

  // Handle Image Upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `image_${Math.random()}.${fileExt}`;
    const filePath = `artworks/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('museum-assets').upload(filePath, file);
    
    if (uploadError) alert('Upload error: ' + uploadError.message);
    else {
      const { data } = supabase.storage.from('museum-assets').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    }
    setUploadingImage(false);
  }

  // Handle Audio Upload
  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `audio_${Math.random()}.${fileExt}`;
    const filePath = `artworks/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('museum-assets').upload(filePath, file);
    
    if (uploadError) alert('Upload error: ' + uploadError.message);
    else {
      const { data } = supabase.storage.from('museum-assets').getPublicUrl(filePath);
      setAudioUrl(data.publicUrl);
    }
    setUploadingAudio(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // Added image_url to the payload to satisfy the database constraint!
    const { error } = await supabase.from('artworks' as any).insert([{ 
      title, artist, description, image_url: imageUrl, audio_url: audioUrl, language 
    }]);
    
    if (!error) { 
      setTitle(''); setArtist(''); setDescription(''); setImageUrl(''); setAudioUrl(''); fetchArtworks(); 
    } else {
      alert("Error: " + error.message);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this artwork? This cannot be undone.')) {
      await supabase.from('artworks' as any).delete().eq('id', id);
      fetchArtworks();
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-100 font-sans">
      <Navigation />
      
      <main className="flex-1 md:ml-64 p-6 md:p-12">
        <h1 className="text-3xl font-black uppercase tracking-widest mb-10 text-amber-600">Digital Museum Control</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* CREATE FORM */}
          <div className="bg-white border border-zinc-300 p-6 md:p-8 shadow-sm">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-6">Catalog New Artwork</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <input type="text" placeholder="ARTWORK TITLE" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} required
                  className="flex-1 bg-zinc-50 border border-zinc-300 p-3 text-xs font-bold focus:border-amber-500 outline-none" />
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-zinc-50 border border-zinc-300 p-3 text-xs uppercase outline-none">
                  <option value="both">BOTH</option>
                  <option value="en">ENG</option>
                  <option value="ar">ARA</option>
                </select>
              </div>
              <input type="text" placeholder="ARTIST NAME" dir="auto" value={artist} onChange={(e) => setArtist(e.target.value)} required
                className="bg-zinc-50 border border-zinc-300 p-3 text-xs uppercase tracking-wider focus:border-amber-500 outline-none" />
              
              {/* IMAGE UPLOADER (Required) */}
              <div className="flex flex-col gap-2 border border-zinc-300 p-3 bg-zinc-50">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">* Main Artwork Image</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} required={!imageUrl} className="text-xs file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 transition-colors" />
                {uploadingImage && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Uploading image...</span>}
                {imageUrl && !uploadingImage && <span className="text-[10px] text-green-600 truncate mt-1">Image linked: {imageUrl}</span>}
              </div>

              {/* AUDIO UPLOADER (Optional) */}
              <div className="flex flex-col gap-2 border border-zinc-300 p-3 bg-zinc-50">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Audio Guide (Optional)</label>
                <input type="file" accept="audio/*" onChange={handleAudioUpload} disabled={uploadingAudio} className="text-xs file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-700 hover:file:bg-zinc-300 transition-colors" />
                {uploadingAudio && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Uploading audio...</span>}
                {audioUrl && !uploadingAudio && <span className="text-[10px] text-green-600 truncate mt-1">Audio linked: {audioUrl}</span>}
              </div>

              <textarea placeholder="CURATORIAL DESCRIPTION" dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4}
                className="bg-zinc-50 border border-zinc-300 p-3 text-sm focus:border-amber-500 outline-none leading-relaxed" />
              <button type="submit" disabled={uploadingImage || uploadingAudio} className="bg-amber-500 text-white font-bold uppercase tracking-widest text-xs py-4 hover:bg-amber-400 transition-colors disabled:opacity-50 mt-2">
                Add to Collection
              </button>
            </form>
          </div>

          {/* LIST VIEW */}
          <div>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-6">Collection Archive</h2>
            {loading ? <p className="text-xs text-amber-500 uppercase tracking-widest">Loading...</p> : (
              <div className="flex flex-col gap-4">
                {artworks.map(art => (
                  <div key={art.id} className="bg-white border border-zinc-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 overflow-hidden" dir="auto">
                      <h3 className="font-bold text-lg truncate text-zinc-900">{art.title}</h3>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest">{art.artist}</p>
                      <span className="inline-block mt-2 text-[10px] uppercase font-mono bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-1">{art.language}</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link href={`/artworks/edit/${art.id}`} className="p-2 border border-zinc-300 hover:bg-zinc-100 transition-colors">
                        <Edit2 size={16} className="text-zinc-600" />
                      </Link>
                      <button onClick={() => handleDelete(art.id)} className="p-2 border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
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
