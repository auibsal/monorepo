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
        // ⚡ Bolt Security Optimization: Sanitize the extension and generate a true cryptographic UUID
        const rawExt = file.name.split('.').pop() || 'bin';
        const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${user.id}_${crypto.randomUUID()}.${safeExt}`;
        
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
    } catch (err: unknown) {
      // Stripped the 'any' bypass and instituted strict error instance checking
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unknown exception occurred during transmission.');
    }
  };

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-8 md:mt-24 px-4">
        {/* Full semantic inversion applied to the success container */}
        <div className="bg-card p-8 md:p-12 border-4 border-border text-foreground shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)] flex flex-col items-center text-center">
          <CheckSquare size={64} className="text-green-500 mb-6" />
          <h2 className="text-2xl md:text-3xl font-black mb-4 uppercase tracking-widest border-b-4 border-border pb-4">Manuscript Secured</h2>
          <p className="font-bold text-xs md:text-sm uppercase tracking-widest text-foreground/70 mb-10 leading-relaxed">
            Your work has been successfully logged in the database and is currently awaiting editorial review.
          </p>
          <Link 
            href="/" 
            className="bg-foreground text-background px-6 py-4 md:px-8 font-bold uppercase tracking-widest border-4 border-border shadow-[4px_4px_0px_0px_var(--primary)] md:shadow-[6px_6px_0px_0px_var(--primary)] hover:shadow-[6px_6px_0px_0px_var(--primary)] md:hover:shadow-[8px_8px_0px_0px_var(--primary)] hover:-translate-y-1 hover:bg-primary hover:border-primary transition-all flex items-center justify-center gap-3 w-full md:w-auto text-sm md:text-base"
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
      
      <div className="flex justify-between items-center border-b-4 border-border pb-4">
        <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-foreground">Submit Work</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-card p-6 md:p-12 border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)] space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label htmlFor="title" className="block text-sm font-bold uppercase tracking-wide text-foreground">
              Manuscript Title <span className="text-primary">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none text-foreground font-bold text-base md:text-lg"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="type" className="block text-sm font-bold uppercase tracking-wide text-foreground">
              Submission Format <span className="text-primary">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setFile(null); 
              }}
              className="w-full p-4 border-4 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none text-foreground font-bold text-base md:text-lg cursor-pointer hover:bg-foreground/5"
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
          <div className="space-y-3 pt-4 border-t-4 border-border/10">
            <label htmlFor="file-upload" className="block text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
               <ImageIcon className="text-primary" size={20} />
               Mount Visual Artifact <span className="text-primary">*</span>
            </label>
            <p className="text-xs text-foreground/60 font-bold uppercase tracking-widest mb-4">
              Requires uncompressed, high-resolution JPEG or PNG matrix.
            </p>
            <div className="relative border-4 border-dashed border-border p-8 md:p-12 hover:bg-foreground/5 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer bg-background">
              <input
                id="file-upload"
                type="file"
                required
                accept="image/jpeg, image/png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Upload size={48} className="text-foreground group-hover:text-primary mb-4 transition-colors" />
              <p className="font-bold uppercase tracking-wider text-sm text-foreground break-words px-2">
                {file ? file.name : 'Click or Drag Image to Mount Payload'}
              </p>
              {file && (
                <p className="text-xs font-mono mt-2 text-primary">({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-4 border-t-4 border-border/10 overflow-hidden">
            <div className="block text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2" id="editor-label">
               <FileText className="text-primary" size={20} />
               Manuscript Editor <span className="text-primary">*</span>
            </div>
            <p className="text-xs text-foreground/60 font-bold uppercase tracking-widest mb-4">
              Compose directly or paste your raw text into the field below.
            </p>
            <div className="border-4 border-border focus-within:border-primary transition-colors bg-background w-full max-w-full overflow-x-hidden" aria-labelledby="editor-label">
               <RichTextEditor content={content} onChange={setContent} />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 border-4 border-red-500 bg-background text-red-500 font-bold text-sm flex items-center gap-3">
             <ShieldAlert size={20} className="flex-shrink-0" />
             <span className="break-words">{errorMessage}</span>
          </div>
        )}

        <div className="pt-8 border-t-4 border-border mt-8">
            <button
            type="submit"
            disabled={status === 'uploading' || (isVisualArt && !file) || (!isVisualArt && !content)}
            className="w-full bg-foreground text-background font-bold uppercase tracking-widest px-6 py-4 md:px-8 md:py-5 border-4 border-border hover:bg-primary hover:border-primary transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] md:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] md:hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1 text-sm md:text-base"
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
