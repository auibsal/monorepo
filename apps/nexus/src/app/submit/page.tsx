'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  Upload,
} from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { RichTextEditor } from '@auibsal/ui';

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

        const { data } = supabase.storage.from('submissions').getPublicUrl(fileName);

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
      setErrorMessage(
        err instanceof Error ? err.message : 'An unknown exception occurred during transmission.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto mt-8 max-w-2xl px-4 md:mt-24">
        {/* Full semantic inversion applied to the success container */}
        <div className="bg-card border-border text-foreground flex flex-col items-center border-4 p-8 text-center shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:p-12 md:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
          <CheckSquare size={64} className="mb-6 text-green-500" />
          <h2 className="border-border mb-4 border-b-4 pb-4 text-2xl font-black uppercase tracking-widest md:text-3xl">
            Manuscript Secured
          </h2>
          <p className="text-foreground/70 mb-10 text-xs font-bold uppercase leading-relaxed tracking-widest md:text-sm">
            Your work has been successfully logged in the database and is currently awaiting
            editorial review.
          </p>
          <Link
            href="/"
            className="bg-foreground text-background border-border hover:bg-primary hover:border-primary flex w-full items-center justify-center gap-3 border-4 px-6 py-4 text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--primary)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--primary)] md:w-auto md:px-8 md:text-base md:shadow-[6px_6px_0px_0px_var(--primary)] md:hover:shadow-[8px_8px_0px_0px_var(--primary)]"
          >
            <ArrowLeft size={20} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-24 mt-8 max-w-4xl space-y-8 px-4 md:mt-12 md:space-y-12 md:px-0">
      <div className="border-border flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-foreground text-2xl font-bold uppercase tracking-widest md:text-3xl">
          Submit Work
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border-border space-y-8 border-4 p-6 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:p-12 md:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <label
              htmlFor="title"
              className="text-foreground block text-sm font-bold uppercase tracking-wide"
            >
              Manuscript Title <span className="text-primary">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border bg-background focus:border-primary focus:ring-primary text-foreground w-full rounded-none border-4 p-4 text-base font-bold transition-all focus:outline-none focus:ring-1 md:text-lg"
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="type"
              className="text-foreground block text-sm font-bold uppercase tracking-wide"
            >
              Submission Format <span className="text-primary">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setFile(null);
              }}
              className="border-border bg-background focus:border-primary focus:ring-primary text-foreground hover:bg-foreground/5 w-full cursor-pointer rounded-none border-4 p-4 text-base font-bold transition-all focus:outline-none focus:ring-1 md:text-lg"
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
          <div className="border-border/10 space-y-3 border-t-4 pt-4">
            <label
              htmlFor="file-upload"
              className="text-foreground block flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
            >
              <ImageIcon className="text-primary" size={20} />
              Mount Visual Artifact <span className="text-primary">*</span>
            </label>
            <p className="text-foreground/60 mb-4 text-xs font-bold uppercase tracking-widest">
              Requires uncompressed, high-resolution JPEG or PNG matrix.
            </p>
            <div className="border-border hover:bg-foreground/5 bg-background group relative flex cursor-pointer flex-col items-center justify-center border-4 border-dashed p-8 text-center transition-colors md:p-12">
              <input
                id="file-upload"
                type="file"
                required
                accept="image/jpeg, image/png"
                onChange={handleFileChange}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <Upload
                size={48}
                className="text-foreground group-hover:text-primary mb-4 transition-colors"
              />
              <p className="text-foreground break-words px-2 text-sm font-bold uppercase tracking-wider">
                {file ? file.name : 'Click or Drag Image to Mount Payload'}
              </p>
              {file && (
                <p className="text-primary mt-2 font-mono text-xs">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="border-border/10 space-y-3 overflow-hidden border-t-4 pt-4">
            <div
              className="text-foreground block flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
              id="editor-label"
            >
              <FileText className="text-primary" size={20} />
              Manuscript Editor <span className="text-primary">*</span>
            </div>
            <p className="text-foreground/60 mb-4 text-xs font-bold uppercase tracking-widest">
              Compose directly or paste your raw text into the field below.
            </p>
            <div
              className="border-border focus-within:border-primary bg-background w-full max-w-full overflow-x-hidden border-4 transition-colors"
              aria-labelledby="editor-label"
            >
              <RichTextEditor content={content} onChange={setContent} />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-background flex items-center gap-3 border-4 border-red-500 p-4 text-sm font-bold text-red-500">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <span className="break-words">{errorMessage}</span>
          </div>
        )}

        <div className="border-border mt-8 border-t-4 pt-8">
          <button
            type="submit"
            disabled={
              status === 'uploading' || (isVisualArt && !file) || (!isVisualArt && !content)
            }
            className="bg-foreground text-background border-border hover:bg-primary hover:border-primary flex w-full items-center justify-center gap-3 border-4 px-6 py-4 text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50 md:px-8 md:py-5 md:text-base md:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] md:hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]"
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
