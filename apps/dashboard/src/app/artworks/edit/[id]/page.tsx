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
                <label className="text-[10px] uppercase tracking-widest text-zinc-500">Artwork
