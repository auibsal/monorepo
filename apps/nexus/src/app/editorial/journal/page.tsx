'use client';

import { createClient } from '@auibsal/auth/client';
import type { JournalIssue } from '@auibsal/database/types';
import { AlertTriangle, ArrowRight, BookOpen, CheckSquare, FileUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function JournalPage() {
  const [issues, setIssues] = useState<JournalIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [vol, setVol] = useState('1');
  const [issue, setIssue] = useState('1');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');

  const supabase = createClient();

  // CRITICAL FIX: Wrapped in useCallback to satisfy strict React concurrency rules
  const fetchIssues = useCallback(async () => {
    if (!supabase) return;
    const { data: issuesData, error } = await supabase
      .from('journal_issues')
      .select('*')
      .order('volume_number', { ascending: false })
      .order('issue_number', { ascending: false });

    if (!error && issuesData) {
      setIssues(issuesData);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const resetFormState = () => {
    setFile(null);
    setTitleEn('');
    setTitleAr('');
    setVol('1');
    setIssue('1');
  };

  const handleUpload = async (e: React.FormEvent) => {
    if (!supabase) return;
    e.preventDefault();
    if (!file || file.type !== 'application/pdf') {
      setStatus('error');
      setErrorMessage('Please provide a valid compiled PDF file for the journal issue.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    try {
      // Cryptographic file naming to prevent CDN collisions
      const fileName = `vol${vol}_issue${issue}_${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('journal_issues')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('journal_issues').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('journal_issues').insert({
        volume_number: parseInt(vol),
        issue_number: parseInt(issue),
        title_en: titleEn,
        title_ar: titleAr,
        pdf_file_url: publicUrl,
      });

      if (dbError) throw dbError;

      setStatus('success');
      resetFormState();
      fetchIssues();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error uploading journal issue.');
    }
  };

  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="flex items-center justify-between border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold tracking-widest text-foreground uppercase">
          Journal CMS
        </h2>
      </div>

      {/* Grid Display for Published Issues */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center p-12">
            {/* CRITICAL FIX: Standardized Brutalist Loading State */}
            <div className="flex animate-pulse items-center gap-3 text-sm font-bold tracking-widest text-foreground/50 uppercase">
              <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
              Polling Journal Matrix...
            </div>
          </div>
        ) : issues.length === 0 ? (
          <div className="col-span-full border-4 border-dashed border-border/30 p-12 text-center text-sm font-bold tracking-widest text-foreground/60 uppercase">
            No published issues found.
          </div>
        ) : (
          issues.map((iss) => (
            <div
              key={iss.id}
              className="flex flex-col justify-between border-4 border-border bg-card p-8 text-foreground shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]"
            >
              <div>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight uppercase">
                      Vol. {iss.volume_number}, Issue {iss.issue_number}
                    </h3>
                    <p className="mt-2 text-xs font-bold tracking-widest text-primary uppercase">
                      {iss.published_at
                        ? new Date(iss.published_at).toLocaleDateString()
                        : 'Unpublished'}
                    </p>
                  </div>
                  <span className="border-2 border-transparent bg-foreground px-3 py-1.5 text-xs font-bold tracking-wider text-background uppercase">
                    {iss.published_at ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="space-y-2 border-t-2 border-border/10 pt-4">
                  <p className="text-sm font-bold tracking-wide text-foreground uppercase">
                    <span className="mr-1 text-xs font-medium text-foreground/50">EN:</span>{' '}
                    {iss.title_en}
                  </p>
                  <p className="text-right text-sm font-bold text-foreground" dir="rtl">
                    <span className="ml-1 text-xs font-medium text-foreground/50" dir="ltr">
                      AR:
                    </span>{' '}
                    {iss.title_ar}
                  </p>
                </div>
              </div>
              {iss.pdf_file_url && (
                <a
                  href={iss.pdf_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 group flex cursor-pointer items-center justify-between border-t-2 border-border/10 bg-background p-4 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-primary hover:text-background"
                >
                  View PDF{' '}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                  />
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload/Creation Section */}
      <div className="max-w-4xl border-4 border-border bg-card p-8 text-foreground shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:p-12">
        <h3 className="mb-4 flex items-center gap-3 border-b-4 border-border pb-4 text-2xl font-bold tracking-widest uppercase">
          <BookOpen className="text-primary" />
          Publish New Issue
        </h3>
        <p className="mb-8 text-xs leading-relaxed font-bold tracking-widest text-foreground/60 uppercase">
          Upload a single, compiled PDF file for the issue. The public web app will automatically
          capture and embed this data stream natively.
        </p>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <label htmlFor="vol" className="block text-sm font-bold tracking-wide uppercase">
                Volume Number
              </label>
              <input
                id="vol"
                type="number"
                required
                min="1"
                value={vol}
                onChange={(e) => setVol(e.target.value)}
                className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="issue" className="block text-sm font-bold tracking-wide uppercase">
                Issue Number
              </label>
              <input
                id="issue"
                type="number"
                required
                min="1"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="titleEn" className="block text-sm font-bold tracking-wide uppercase">
                Title (English)
              </label>
              <input
                id="titleEn"
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="space-y-3" dir="rtl">
              <label
                htmlFor="titleAr"
                className="block text-right text-sm font-bold tracking-wide uppercase"
              >
                العنوان (عربي)
              </label>
              <input
                id="titleAr"
                type="text"
                required
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="w-full rounded-none border-4 border-border bg-background p-4 text-lg font-bold text-foreground transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="pdfFile" className="block text-sm font-bold tracking-wide uppercase">
              Compiled PDF File
            </label>
            <div className="group relative flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-border bg-background p-8 text-center transition-colors hover:bg-foreground/5">
              {/* CRITICAL FIX: The dynamic key mathematically guarantees the DOM input is destroyed and rebuilt when the state clears, preventing the Ghost Input trap. */}
              <input
                id="pdfFile"
                key={file ? 'loaded' : 'empty'}
                type="file"
                required
                accept="application/pdf"
                onChange={(e) => {
                  setFile(
                    e.target.files && e.target.files.length > 0 ? e.target.files[0] || null : null,
                  );
                  if (status === 'success') setStatus('idle');
                  if (status === 'error') setStatus('idle');
                }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <FileUp
                size={40}
                className="mb-3 text-foreground transition-colors group-hover:text-primary"
              />
              <p className="px-2 text-sm font-bold tracking-wider text-foreground uppercase">
                {file ? file.name : 'Click or Drag PDF to Mount File'}
              </p>
              {file && (
                <p className="mt-2 font-mono text-xs text-primary">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          {status === 'error' && errorMessage && (
            <div className="flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
              <AlertTriangle size={20} className="flex-shrink-0" />
              <span className="break-words">{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 border-4 border-green-500 bg-background p-4 text-sm font-bold text-green-500">
              <CheckSquare size={20} className="flex-shrink-0" />
              <span>Issue successfully published!</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={status === 'uploading' || !file}
              className="flex items-center gap-3 border-4 border-border bg-foreground px-8 py-4 font-bold tracking-wider text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
            >
              {/* CRITICAL FIX: Standardized Brutalist Uploading State */}
              {status === 'uploading' && (
                <div className="h-4 w-4 animate-spin rounded-none bg-background"></div>
              )}
              {status === 'uploading' ? 'Transmitting Payload...' : 'Publish Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
