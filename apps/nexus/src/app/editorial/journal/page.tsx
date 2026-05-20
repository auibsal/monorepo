'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { JournalIssue } from '@auibsal/database';
import { FileUp, BookOpen, AlertTriangle, CheckSquare, ArrowRight } from 'lucide-react';

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
      // ⚡ Bolt Performance Optimization: Explicitly select only required fields to prevent over-fetching
      .select('id, volume_number, issue_number, published_at, title_en, title_ar, file_url')
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

      const { data: { publicUrl } } = supabase.storage
        .from('journal_issues')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('journal_issues').insert({
        volume_number: parseInt(vol),
        issue_number: parseInt(issue),
        title_en: titleEn,
        title_ar: titleAr,
        file_url: publicUrl 
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
      <div className="flex justify-between items-center border-b-4 border-auib-charcoal pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Journal CMS</h2>
      </div>

      {/* Grid Display for Published Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
            <div className="text-auib-charcoal font-bold uppercase tracking-widest text-sm p-4">Loading issues...</div>
        ) : issues.length === 0 ? (
            <div className="text-auib-charcoal/60 font-bold uppercase tracking-widest text-sm p-4 border-4 border-dashed border-auib-charcoal/30 text-center col-span-full">
              No published issues found.
            </div>
        ) : issues.map(iss => (
            <div key={iss.id} className="bg-white p-8 border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] text-auib-charcoal hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#273237] transition-all flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight">Vol. {iss.volume_number}, Issue {iss.issue_number}</h3>
                            <p className="text-xs font-bold text-auib-red uppercase tracking-widest mt-2">{new Date(iss.published_at).toLocaleDateString()}</p>
                        </div>
                        <span className="bg-auib-charcoal text-white py-1.5 px-3 border-2 border-transparent text-xs font-bold uppercase tracking-wider">Published</span>
                    </div>
                    <div className="space-y-2 border-t-2 border-auib-charcoal/10 pt-4">
                      <p className="font-bold text-sm text-auib-charcoal uppercase tracking-wide"><span className="text-xs font-medium text-auib-charcoal/50 mr-1">EN:</span> {iss.title_en}</p>
                      <p className="font-bold text-sm text-auib-charcoal text-right" dir="rtl"><span className="text-xs font-medium text-auib-charcoal/50 ml-1" dir="ltr">AR:</span> {iss.title_ar}</p>
                    </div>
                </div>
                {iss.file_url && (
                    <a href={iss.file_url} target="_blank" rel="noopener noreferrer" className="text-auib-red font-bold text-sm hover:text-auib-charcoal uppercase tracking-widest inline-flex items-center gap-2 mt-8 group">
                      View PDF <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                    </a>
                )}
            </div>
        ))}
      </div>

      {/* Upload/Creation Section */}
      <div className="bg-white text-auib-charcoal p-8 md:p-12 border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] max-w-4xl">
        <h3 className="text-2xl font-bold mb-4 uppercase tracking-widest border-b-4 border-auib-charcoal pb-4 flex items-center gap-3">
          <BookOpen className="text-auib-red" />
          Publish New Issue
        </h3>
        <p className="mb-8 font-bold uppercase tracking-widest text-xs text-auib-charcoal/60 leading-relaxed">
          Upload a single, compiled PDF file for the issue. The public web app will automatically capture and embed this data stream natively.
        </p>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide">Volume Number</label>
              <input type="number" required min="1" value={vol} onChange={e=>setVol(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold" />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide">Issue Number</label>
              <input type="number" required min="1" value={issue} onChange={e=>setIssue(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold" />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide">Title (English)</label>
              <input type="text" required value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold" />
            </div>
            <div className="space-y-3" dir="rtl">
              <label className="block text-sm font-bold uppercase tracking-wide text-right">العنوان (عربي)</label>
              <input type="text" required value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold text-lg" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Compiled PDF File</label>
            <div className="relative border-4 border-dashed border-auib-charcoal p-8 hover:bg-auib-charcoal/5 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer">
              <input
                type="file"
                required
                accept="application/pdf"
                onChange={(e) => {
                  setFile(e.target.files ? e.target.files[0] : null);
                  if(status === 'success') setStatus('idle');
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <FileUp size={40} className="text-auib-charcoal group-hover:text-auib-red mb-3 transition-colors" />
              <p className="font-bold uppercase tracking-wider text-sm text-auib-charcoal">
                {file ? file.name : 'Click or Drag PDF to Mount File'}
              </p>
              {file && (
                <p className="text-xs font-mono mt-1 text-auib-red">({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 border-4 border-auib-red bg-white text-auib-red font-bold text-sm flex items-center gap-3">
              <AlertTriangle size={20} />
              {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="p-4 border-4 border-auib-charcoal bg-auib-charcoal text-white font-bold text-sm flex items-center gap-3">
              <CheckSquare size={20} className="text-green-400" />
              Issue successfully published!
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={status === 'uploading' || !file}
              className="bg-auib-charcoal text-white font-bold uppercase tracking-wider px-8 py-4 border-4 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors disabled:opacity-50 shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-0.5"
            >
              {status === 'uploading' ? 'Uploading...' : 'Publish Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
