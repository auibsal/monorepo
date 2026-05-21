'use client';

import { useEffect, useState } from 'react';

import { AlertTriangle, ArrowRight, BookOpen, CheckSquare, FileUp } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { JournalIssue } from '@auibsal/database';

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

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
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
  };

  // CRITICAL: Complete pruning sequence to eliminate stale text fields
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
      setErrorMessage('Please provide a valid compiled PDF file for the journal issue.');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    try {
      const fileName = `vol${vol}_issue${issue}_${Date.now()}.pdf`;

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
        file_url: publicUrl,
      });

      if (dbError) throw dbError;

      setStatus('success');
      resetFormState();
      fetchIssues();
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Error uploading journal issue.');
    }
  };

  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="border-auib-charcoal flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-auib-charcoal text-3xl font-bold uppercase tracking-widest">
          Journal CMS
        </h2>
      </div>

      {/* Grid Display for Published Issues */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="text-auib-charcoal p-4 text-sm font-bold uppercase tracking-widest">
            Loading issues...
          </div>
        ) : issues.length === 0 ? (
          <div className="text-auib-charcoal/60 border-auib-charcoal/30 col-span-full border-4 border-dashed p-4 text-center text-sm font-bold uppercase tracking-widest">
            No published issues found.
          </div>
        ) : (
          issues.map((iss) => (
            <div
              key={iss.id}
              className="border-auib-charcoal text-auib-charcoal flex flex-col justify-between border-4 bg-white p-8 shadow-[8px_8px_0px_0px_#273237] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_#273237]"
            >
              <div>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">
                      Vol. {iss.volume_number}, Issue {iss.issue_number}
                    </h3>
                    <p className="text-auib-red mt-2 text-xs font-bold uppercase tracking-widest">
                      {new Date(iss.published_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="bg-auib-charcoal border-2 border-transparent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                    Published
                  </span>
                </div>
                <div className="border-auib-charcoal/10 space-y-2 border-t-2 pt-4">
                  <p className="text-auib-charcoal text-sm font-bold uppercase tracking-wide">
                    <span className="text-auib-charcoal/50 mr-1 text-xs font-medium">EN:</span>{' '}
                    {iss.title_en}
                  </p>
                  <p className="text-auib-charcoal text-right text-sm font-bold" dir="rtl">
                    <span className="text-auib-charcoal/50 ml-1 text-xs font-medium" dir="ltr">
                      AR:
                    </span>{' '}
                    {iss.title_ar}
                  </p>
                </div>
              </div>
              {iss.file_url && (
                <a
                  href={iss.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-auib-red hover:text-auib-charcoal group mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
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
      <div className="text-auib-charcoal border-auib-charcoal max-w-4xl border-4 bg-white p-8 shadow-[12px_12px_0px_0px_#273237] md:p-12">
        <h3 className="border-auib-charcoal mb-4 flex items-center gap-3 border-b-4 pb-4 text-2xl font-bold uppercase tracking-widest">
          <BookOpen className="text-auib-red" />
          Publish New Issue
        </h3>
        <p className="text-auib-charcoal/60 mb-8 text-xs font-bold uppercase leading-relaxed tracking-widest">
          Upload a single, compiled PDF file for the issue. The public web app will automatically
          capture and embed this data stream natively.
        </p>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide">
                Volume Number
              </label>
              <input
                type="number"
                required
                min="1"
                value={vol}
                onChange={(e) => setVol(e.target.value)}
                className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-bold focus:outline-none focus:ring-1"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide">
                Issue Number
              </label>
              <input
                type="number"
                required
                min="1"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-bold focus:outline-none focus:ring-1"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide">
                Title (English)
              </label>
              <input
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-bold focus:outline-none focus:ring-1"
              />
            </div>
            <div className="space-y-3" dir="rtl">
              <label className="block text-right text-sm font-bold uppercase tracking-wide">
                العنوان (عربي)
              </label>
              <input
                type="text"
                required
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 text-lg font-bold focus:outline-none focus:ring-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">
              Compiled PDF File
            </label>
            <div className="border-auib-charcoal hover:bg-auib-charcoal/5 group relative flex cursor-pointer flex-col items-center justify-center border-4 border-dashed p-8 text-center transition-colors">
              <input
                type="file"
                required
                accept="application/pdf"
                onChange={(e) => {
                  setFile(e.target.files ? e.target.files[0] : null);
                  if (status === 'success') setStatus('idle');
                }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <FileUp
                size={40}
                className="text-auib-charcoal group-hover:text-auib-red mb-3 transition-colors"
              />
              <p className="text-auib-charcoal text-sm font-bold uppercase tracking-wider">
                {file ? file.name : 'Click or Drag PDF to Mount File'}
              </p>
              {file && (
                <p className="text-auib-red mt-1 font-mono text-xs">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="border-auib-red text-auib-red flex items-center gap-3 border-4 bg-white p-4 text-sm font-bold">
              <AlertTriangle size={20} />
              {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="border-auib-charcoal bg-auib-charcoal flex items-center gap-3 border-4 p-4 text-sm font-bold text-white">
              <CheckSquare size={20} className="text-green-400" />
              Issue successfully published!
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={status === 'uploading' || !file}
              className="bg-auib-charcoal border-auib-charcoal hover:bg-auib-red hover:border-auib-red border-4 px-8 py-4 font-bold uppercase tracking-wider text-white shadow-[6px_6px_0px_0px_#273237] transition-colors hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_#273237] disabled:opacity-50"
            >
              {status === 'uploading' ? 'Uploading...' : 'Publish Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
