'use client';

import { createClient } from '@auibsal/auth/client';
import type { SubmissionType } from '@auibsal/database';
import { RichTextEditor } from '@auibsal/ui/components/RichTextEditor';
import {
  ArrowLeft,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function SubmitWorkPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SubmissionType | 'visual_art'>('essay');
  const [submissionMethod, setSubmissionMethod] = useState<'editor' | 'pdf'>('editor');
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  // CRITICAL FIX: Dynamically binding the visual art pipeline to the exact dropdown state
  const isVisualArt = type === 'visual_art';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
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

    // Validations based on the active method and type
    if (isVisualArt && !file) {
      setErrorMessage('Please mount a visual artifact to upload.');
      return;
    }

    if (!isVisualArt) {
      if (submissionMethod === 'editor' && (!content || content.trim() === '')) {
        setErrorMessage('Please enter your submission content.');
        return;
      }
      if (submissionMethod === 'pdf' && !file) {
        setErrorMessage('Please mount a PDF artifact to upload.');
        return;
      }
    }

    setStatus('uploading');
    setErrorMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let publicUrl: string | undefined;

      // Storage upload executes if a file exists, covering both Visual Art (Images) and Written Work (PDFs)
      if (file) {
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

      // Execute the database mutation
      const { error: dbError } = await supabase.from('submissions').insert({
        author_id: user.id,
        title,
        // Enforcing strict type boundaries for the database enum
        type: type as SubmissionType,
        status: 'pending',
        file_url: publicUrl || null,
        // Only inject raw text content if it's a written work submitted via the editor
        content: !isVisualArt && submissionMethod === 'editor' ? content : null,
      });

      if (dbError) throw dbError;

      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'An unknown exception occurred during transmission.',
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto mt-8 max-w-2xl px-4 md:mt-24">
        <div className="flex flex-col items-center border-4 border-border bg-card p-8 text-center text-foreground shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:p-12 md:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
          <CheckSquare size={64} className="mb-6 text-green-500" />
          <h2 className="mb-4 border-b-4 border-border pb-4 text-2xl font-black tracking-widest uppercase md:text-3xl">
            Manuscript Secured
          </h2>
          <p className="mb-10 text-xs leading-relaxed font-bold tracking-widest text-foreground/70 uppercase md:text-sm">
            Your work has been successfully logged in the database and is currently awaiting
            editorial review.
          </p>
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-3 border-4 border-border bg-foreground px-6 py-4 text-sm font-bold tracking-widest text-background uppercase shadow-[4px_4px_0px_0px_var(--primary)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[6px_6px_0px_0px_var(--primary)] md:w-auto md:px-8 md:text-base md:shadow-[6px_6px_0px_0px_var(--primary)] md:hover:shadow-[8px_8px_0px_0px_var(--primary)]"
          >
            <ArrowLeft size={20} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 mb-24 max-w-4xl space-y-8 px-4 md:mt-12 md:space-y-12 md:px-0">
      <div className="flex items-center justify-between border-b-4 border-border pb-4">
        <h2 className="text-2xl font-bold tracking-widest text-foreground uppercase md:text-3xl">
          Submit Work
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 border-4 border-border bg-card p-6 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:p-12 md:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <label
              htmlFor="title"
              className="block text-sm font-bold tracking-wide text-foreground uppercase"
            >
              Manuscript Title <span className="text-primary">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-none border-4 border-border bg-background p-4 text-base font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none md:text-lg"
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="type"
              className="block text-sm font-bold tracking-wide text-foreground uppercase"
            >
              Submission Format <span className="text-primary">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as SubmissionType | 'visual_art');
                // Automatically nullify any mounted files when crossing submission bounds
                setFile(null);
                setContent('');
              }}
              className="w-full cursor-pointer rounded-none border-4 border-border bg-background p-4 text-base font-bold text-foreground transition-all hover:bg-foreground/5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none md:text-lg"
            >
              <option value="essay">Essay / Non-Fiction</option>
              <option value="fiction">Fiction</option>
              <option value="poetry">Poetry</option>
              <option value="theatre">Theatre / Screenplay</option>
              {/* CRITICAL FIX: Reintroduced the Visual Art vector */}
              <option value="visual_art">Visual Art / Photography</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Dynamic Input Switching */}
        {isVisualArt ? (
          <div className="space-y-3 border-t-4 border-border/10 pt-4">
            <label
              htmlFor="file-upload"
              className="block flex items-center gap-2 text-sm font-bold tracking-wide text-foreground uppercase"
            >
              <ImageIcon className="text-primary" size={20} />
              Mount Visual Artifact <span className="text-primary">*</span>
            </label>
            <p className="mb-4 text-xs font-bold tracking-widest text-foreground/60 uppercase">
              Requires uncompressed, high-resolution JPEG or PNG matrix.
            </p>
            <div className="group relative flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-border bg-background p-8 text-center transition-colors hover:bg-foreground/5 md:p-12">
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
                className="mb-4 text-foreground transition-colors group-hover:text-primary"
              />
              <p className="px-2 text-sm font-bold tracking-wider break-words text-foreground uppercase">
                {file ? file.name : 'Click or Drag Image to Mount Payload'}
              </p>
              {file && (
                <p className="mt-2 font-mono text-xs text-primary">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 border-t-4 border-border/10 pt-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setSubmissionMethod('editor');
                  setFile(null);
                }}
                className={`flex-1 border-4 p-3 text-xs font-bold tracking-widest uppercase transition-all md:text-sm ${submissionMethod === 'editor' ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-foreground/50 hover:border-primary/50 hover:text-foreground'}`}
              >
                Use Editor
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmissionMethod('pdf');
                  setContent('');
                }}
                className={`flex-1 border-4 p-3 text-xs font-bold tracking-widest uppercase transition-all md:text-sm ${submissionMethod === 'pdf' ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-foreground/50 hover:border-primary/50 hover:text-foreground'}`}
              >
                Upload PDF
              </button>
            </div>

            {submissionMethod === 'editor' ? (
              <div className="space-y-3 overflow-hidden">
                <div
                  className="block flex items-center gap-2 text-sm font-bold tracking-wide text-foreground uppercase"
                  id="editor-label"
                >
                  <FileText className="text-primary" size={20} />
                  Manuscript Editor <span className="text-primary">*</span>
                </div>
                <p className="mb-4 text-xs font-bold tracking-widest text-foreground/60 uppercase">
                  Compose directly or paste your raw text into the field below.
                </p>
                <div className="w-full max-w-full overflow-x-hidden border-4 border-border bg-background transition-colors focus-within:border-primary">
                  <RichTextEditor content={content} onChange={setContent} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor="pdf-upload"
                  className="block flex items-center gap-2 text-sm font-bold tracking-wide text-foreground uppercase"
                >
                  <FileText className="text-primary" size={20} />
                  Mount PDF Artifact <span className="text-primary">*</span>
                </label>
                <p className="mb-4 text-xs font-bold tracking-widest text-foreground/60 uppercase">
                  Required for theatre scripts or heavily formatted submissions.
                </p>
                <div className="group relative flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-border bg-background p-8 text-center transition-colors hover:bg-foreground/5 md:p-12">
                  <input
                    id="pdf-upload"
                    type="file"
                    required
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <Upload
                    size={48}
                    className="mb-4 text-foreground transition-colors group-hover:text-primary"
                  />
                  <p className="px-2 text-sm font-bold tracking-wider break-words text-foreground uppercase">
                    {file ? file.name : 'Click or Drag PDF to Mount Payload'}
                  </p>
                  {file && (
                    <p className="mt-2 font-mono text-xs text-primary">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <span className="break-words">{errorMessage}</span>
          </div>
        )}

        <div className="mt-8 border-t-4 border-border pt-8">
          <button
            type="submit"
            disabled={
              status === 'uploading' ||
              (isVisualArt && !file) ||
              (!isVisualArt && submissionMethod === 'editor' && !content) ||
              (!isVisualArt && submissionMethod === 'pdf' && !file)
            }
            className="flex w-full items-center justify-center gap-3 border-4 border-border bg-foreground px-6 py-4 text-sm font-bold tracking-widest text-background uppercase shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50 md:px-8 md:py-5 md:text-base md:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] md:hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]"
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
