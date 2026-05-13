'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { JournalIssue } from 'database';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl ? createBrowserClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('journal_issues').select('*').order('volume_number', { ascending: false }).order('issue_number', { ascending: false });
    if (!error && data) {
      setIssues(data);
    }
    setLoading(false);
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
        file_url: publicUrl // Assuming this column exists like submissions
      });

      if (dbError) throw dbError;

      setStatus('success');
      setFile(null);
      fetchIssues(); // Refresh list
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Error uploading journal issue.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-auib-white">Journal CMS</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {loading ? (
            <div className="text-auib-white font-mono p-4">Loading issues...</div>
        ) : issues.length === 0 ? (
            <div className="text-auib-white font-mono p-4">No published issues found.</div>
        ) : issues.map(iss => (
            <div key={iss.id} className="bg-auib-white p-6 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] text-auib-charcoal">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-wide">Volume {iss.volume_number}, Issue {iss.issue_number}</h3>
                        <p className="text-sm font-mono text-auib-charcoal/70 mt-1">{new Date(iss.published_at).toLocaleDateString()}</p>
                    </div>
                    <span className="bg-auib-red text-auib-white py-1 px-2 border-2 border-auib-red text-xs font-bold uppercase tracking-wider">Published</span>
                </div>
                {iss.file_url && (
                    <a href={iss.file_url} target="_blank" rel="noopener noreferrer" className="text-auib-red font-bold text-sm hover:underline uppercase tracking-widest inline-block mt-4">View PDF &rarr;</a>
                )}
            </div>
        ))}
      </div>

      <div className="bg-auib-white text-auib-charcoal p-8 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] max-w-4xl">
        <h3 className="text-xl font-bold mb-6 uppercase tracking-widest border-b-2 border-auib-charcoal pb-2">Publish New Issue</h3>
        <p className="mb-6 font-mono text-sm text-auib-charcoal/80">Upload a single, compiled PDF file for the issue. The public web app will embed this PDF directly.</p>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase tracking-wide">Volume Number</label>
              <input type="number" required value={vol} onChange={e=>setVol(e.target.value)} className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase tracking-wide">Issue Number</label>
              <input type="number" required value={issue} onChange={e=>setIssue(e.target.value)} className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase tracking-wide">Title (EN)</label>
              <input type="text" required value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
            </div>
            <div className="space-y-2" dir="rtl">
              <label className="block text-sm font-bold uppercase tracking-wide text-left" dir="ltr">Title (AR)</label>
              <input type="text" required value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wide">Compiled PDF File</label>
            <input
              type="file"
              required
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full p-3 border-2 border-dashed border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-bold file:bg-auib-charcoal file:text-white hover:file:bg-auib-red"
            />
          </div>

          {errorMessage && (
            <div className="p-3 border-2 border-auib-red text-auib-red font-bold text-sm">
              {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="p-3 border-2 border-auib-charcoal bg-auib-charcoal text-auib-white font-bold text-sm">
              Issue successfully published!
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={status === 'uploading' || !file}
              className="bg-auib-charcoal text-auib-white font-bold uppercase tracking-wider px-8 py-4 border-2 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors disabled:opacity-50 shadow-[4px_4px_0px_0px_#9C213E]"
            >
              {status === 'uploading' ? 'Uploading...' : 'Publish Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
