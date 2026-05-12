'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function SubmitWorkPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('essay');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl ? createBrowserClient(supabaseUrl, supabaseKey) : null;

  const isVisualArt = type === 'visual_art';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validation based on type
      if (isVisualArt) {
        if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
          setErrorMessage('Visual Art requires high-resolution JPEG or PNG.');
          setFile(null);
          return;
        }
      } else {
        if (selectedFile.type !== 'application/pdf') {
          setErrorMessage('Prose/Poetry requires a PDF document.');
          setFile(null);
          return;
        }
      }

      setErrorMessage('');
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!supabase) return;
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(filePath);

      // Insert into database
      const { error: dbError } = await supabase.from('submissions').insert({
        author_id: user.id,
        title,
        type,
        status: 'pending',
        file_url: publicUrl,
        content: '', // Leaving empty since we use files now
      });

      if (dbError) throw dbError;

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred during submission.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-auib-charcoal p-8 border-2 border-auib-white text-auib-white shadow-[8px_8px_0px_0px_#FFFFFF] max-w-2xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest">Submission Received</h2>
        <p className="font-mono mb-6">Your work has been successfully submitted and is pending editorial review.</p>
        <button onClick={() => window.location.href = '/'} className="bg-auib-white text-auib-charcoal px-6 py-3 font-bold uppercase tracking-widest border-2 border-auib-white hover:bg-auib-red hover:text-auib-white transition-colors">
          Return to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-widest text-auib-white">Submit Work</h2>

      <form onSubmit={handleSubmit} className="bg-auib-white p-8 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none text-auib-charcoal"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">Submission Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setFile(null); // reset file when type changes to enforce validation
            }}
            className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none text-auib-charcoal"
          >
            <option value="essay">Essay / Non-Fiction</option>
            <option value="fiction">Fiction</option>
            <option value="poetry">Poetry</option>
            <option value="theatre">Theatre / Screenplay</option>
            <option value="visual_art">Visual Art</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">
            Upload File
          </label>
          <p className="text-xs text-auib-charcoal/70 mb-2 font-mono">
            {isVisualArt ? "Requires high-resolution JPEG or PNG." : "Requires a PDF document."}
          </p>
          <input
            type="file"
            required
            accept={isVisualArt ? "image/jpeg, image/png" : "application/pdf"}
            onChange={handleFileChange}
            className="w-full p-3 border-2 border-dashed border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none text-auib-charcoal file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-bold file:bg-auib-charcoal file:text-white hover:file:bg-auib-red"
          />
        </div>

        {errorMessage && (
          <div className="p-3 border-2 border-auib-red text-auib-red font-bold text-sm bg-auib-white">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'uploading' || !file}
          className="w-full bg-auib-charcoal text-auib-white font-bold uppercase tracking-widest px-6 py-4 border-2 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors disabled:opacity-50"
        >
          {status === 'uploading' ? 'Uploading...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
