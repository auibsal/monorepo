'use client';

import { useState } from 'react';
import { createClient } from '@auibsal/auth/client';
import { RichTextEditor } from '@auibsal/ui';
import Link from 'next/link';
import { Upload, CheckSquare, ShieldAlert, FileText, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export default function SubmitWorkPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('essay');
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const isVisualArt = type === 'visual_art';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (isVisualArt) {
        if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
          setErrorMessage('Visual Art requires high-resolution JPEG or PNG format.');
          setFile(null);
          return;
        }
      } else {
        if (selectedFile.type !== 'application/pdf') {
          setErrorMessage('Written work requires a PDF document.');
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
    
    if (isVisualArt && !file) {
      setErrorMessage('Please mount a file to upload.');
      return;
    }

    if (!isVisualArt && (!content || content.trim() === '')) {
      setErrorMessage('Please enter your submission content.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let publicUrl: string | undefined = undefined;

      if (isVisualArt && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('submissions')
          .getPublicUrl(fileName);
          
        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('submissions').insert({
        author_id: user.id,
        title,
        type,
        status: 'pending',
        file_url: publicUrl || null,
        content: isVisualArt ? null : content,
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
      <div className="max-w-2xl mx-auto mt-8 md:mt-24 px-4">
        <div className="bg-white p-8 md:p-12 border-4 border-auib-charcoal text-auib-charcoal shadow-[8px_8px_0px_0px_#273237] md:shadow-[16px_16px_0px_0px_#273237] flex flex-col items-center text-center">
          <CheckSquare size={64} className="text-green-500 mb-6" />
          <h2 className="text-2xl md:text-3xl font-black mb-4 uppercase tracking-widest border-b-4 border-auib-charcoal pb-4">Manuscript Secured</h2>
          <p className="font-bold text-xs md:text-sm uppercase tracking-widest text-auib-charcoal/70 mb-10 leading-relaxed">
            Your work has been successfully logged in the database and is currently awaiting editorial review.
          </p>
          <Link 
            href="/" 
            className="bg-auib-charcoal text-white px-6 py-4 md:px-8 font-bold uppercase tracking-widest border-4 border-auib-charcoal shadow-[4px_4px_0px_0px_#9C213E] md:shadow-[6px_6px_0px_0px_#9C213E] hover:shadow-[6px_6px_0px_0px_#9C213E] md:hover:shadow-[8px_8px_0px_0px_#9C213E] hover:-translate-y-1 hover:bg-auib-red hover:border-auib-red transition-all flex items-center justify-center gap-3 w-full md:w-auto text-sm md:text-base"
          >
            <ArrowLeft size={20} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 md:mt-12 mb-24 space-y-8 md:space-y-12 px-4 md:px-0">
      
      <div className="flex justify-between items-center border-b-4 border-auib-charcoal pb-4">
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Submit Work</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] md:shadow-[16px_16px_0px_0px_#273237] space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">Manuscript Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none text-auib-charcoal font-bold text-base md:text-lg"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal">Submission Format</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setFile(null); 
              }}
              className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none text-auib-charcoal font-bold text-base md:text-lg cursor-pointer hover:bg-auib-charcoal/5"
            >
              <option value="essay">Essay / Non-Fiction</option>
              <option value="fiction">Fiction</option>
              <option value="poetry">Poetry</option>
              <option value="theatre">Theatre / Screenplay</option>
              <option value="visual_art">Visual Art</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {isVisualArt ? (
          <div className="space-y-3 pt-4 border-t-4 border-auib-charcoal/10">
            <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal flex items-center gap-2">
               <ImageIcon className="text-auib-red" size={20} />
               Mount Visual Artifact
            </label>
            <p className="text-xs text-auib-charcoal/60 font-bold uppercase tracking-widest mb-4">
              Requires uncompressed, high-resolution JPEG or PNG matrix.
            </p>
            <div className="relative border-4 border-dashed border-auib-charcoal p-8 md:p-12 hover:bg-auib-charcoal/5 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer bg-white">
              <input
                type="file"
                required
                accept="image/jpeg, image/png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Upload size={48} className="text-auib-charcoal group-hover:text-auib-red mb-4 transition-colors" />
              <p className="font-bold uppercase tracking-wider text-sm text-auib-charcoal break-words px-2">
                {file ? file.name : 'Click or Drag Image to Mount Payload'}
              </p>
              {file && (
                <p className="text-xs font-mono mt-2 text-auib-red">({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-4 border-t-4 border-auib-charcoal/10 overflow-hidden">
            <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal flex items-center gap-2">
               <FileText className="text-auib-red" size={20} />
               Manuscript Editor
            </label>
            <p className="text-xs text-auib-charcoal/60 font-bold uppercase tracking-widest mb-4">
              Compose directly or paste your raw text into the field below.
            </p>
            <div className="border-4 border-auib-charcoal focus-within:border-auib-red transition-colors bg-white w-full max-w-full overflow-x-hidden">
               <RichTextEditor content={content} onChange={setContent} />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 border-4 border-auib-red bg-white text-auib-red font-bold text-sm flex items-center gap-3">
             <ShieldAlert size={20} className="flex-shrink-0" />
             <span className="break-words">{errorMessage}</span>
          </div>
        )}

        <div className="pt-8 border-t-4 border-auib-charcoal mt-8">
            <button
            type="submit"
            disabled={status === 'uploading' || (isVisualArt && !file) || (!isVisualArt && !content)}
            className="w-full bg-auib-charcoal text-white font-bold uppercase tracking-widest px-6 py-4 md:px-8 md:py-5 border-4 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_#273237] md:shadow-[6px_6px_0px_0px_#273237] hover:shadow-[6px_6px_0px_0px_#273237] md:hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-1 text-sm md:text-base"
            >
            {status === 'uploading' ? (
                <>
                    <Upload className="animate-bounce" size={20} />
                    Transmitting...
                </>
            ) : (
                'Transmit Manuscript'
            )}
            </button>
        </div>
      </form>
    </div>
  );
}
