'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Submission } from 'database';

export default function GradingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const [tech, setTech] = useState<string>('');
  const [orig, setOrig] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const [archive, setArchive] = useState<boolean | null>(null);
  const [formatting, setFormatting] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl ? createBrowserClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    async function fetchSub() {
      if (!supabase) return;
      const { data } = await supabase.from('submissions').select('*').eq('id', submissionId).single();
      if (data) {
        setSubmission(data);
        setTech(data.rubric_technical !== undefined && data.rubric_technical !== null ? String(data.rubric_technical) : '');
        setOrig(data.rubric_originality !== undefined && data.rubric_originality !== null ? String(data.rubric_originality) : '');
        setTheme(data.rubric_thematic !== undefined && data.rubric_thematic !== null ? String(data.rubric_thematic) : '');
        setArchive(data.rubric_archive ?? null);
        setFormatting(data.rubric_formatting || '');
      }
      setLoading(false);
    }
    fetchSub();
  }, [submissionId, supabase]);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from('submissions').update({
      rubric_technical: tech ? parseInt(tech) : null,
      rubric_originality: orig ? parseInt(orig) : null,
      rubric_thematic: theme ? parseInt(theme) : null,
      rubric_archive: archive,
      rubric_formatting: formatting || null,
    }).eq('id', submissionId);

    setSaving(false);
    if (!error) {
      alert('Rubric saved successfully.');
    } else {
      alert('Error saving rubric: ' + error.message);
    }
  };

  const handleDisqualify = async () => {
    if (!supabase) return;
    if (confirm('Are you sure you want to disqualify this submission? This will update the status to "rejected" and formatting to "disqualified".')) {
      const { error } = await supabase.from('submissions').update({
        status: 'rejected',
        rubric_formatting: 'disqualified',
      }).eq('id', submissionId);

      if (!error) {
        router.push('/submissions');
      }
    }
  };

  if (loading) return <div className="text-auib-white font-mono p-8">Loading submission...</div>;
  if (!submission) return <div className="text-auib-white font-mono p-8">Submission not found.</div>;

  const totalScore = (tech ? parseInt(tech) : 0) + (orig ? parseInt(orig) : 0) + (theme ? parseInt(theme) : 0);

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      {/* File Viewer Side */}
      <div className="flex-1 bg-auib-white text-auib-charcoal border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] flex flex-col">
        <div className="p-4 border-b-2 border-auib-charcoal flex justify-between items-center bg-auib-charcoal text-auib-white">
          <h2 className="font-bold uppercase tracking-widest">{submission.title}</h2>
          <span className="text-xs font-mono bg-auib-white text-auib-charcoal px-2 py-1 uppercase">{submission.type}</span>
        </div>
        <div className="flex-1 min-h-[600px] p-4 bg-gray-100 flex items-center justify-center overflow-hidden">
          {submission.file_url ? (
            submission.file_url.endsWith('.pdf') ? (
              <iframe src={submission.file_url} className="w-full h-[600px] border-2 border-auib-charcoal" />
            ) : (

              <img src={submission.file_url} alt="Submission" className="max-w-full max-h-[600px] object-contain border-2 border-auib-charcoal" />
            )
          ) : (
            <div className="flex items-center justify-center h-full font-mono text-auib-charcoal/50">
              No file attached.
            </div>
          )}
        </div>
      </div>

      {/* Grading Side */}
      <div className="w-full md:w-96 bg-auib-white p-6 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] text-auib-charcoal flex flex-col gap-6">
        <div className="flex justify-between items-center border-b-2 border-auib-charcoal pb-4">
          <h3 className="text-xl font-bold uppercase tracking-widest">Rubric</h3>
          <div className="bg-auib-charcoal text-auib-white font-bold font-mono px-3 py-1 border-2 border-auib-charcoal shadow-[4px_4px_0px_0px_#9C213E]">
            {totalScore} / 60
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wide">Technical Command & Craft</label>
            <select value={tech} onChange={e=>setTech(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wide">Originality & Voice</label>
            <select value={orig} onChange={e=>setOrig(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wide">Thematic Depth & Resonance</label>
            <select value={theme} onChange={e=>setTheme(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-2 pt-4 border-t-2 border-auib-charcoal/20">
            <label className="block text-sm font-bold uppercase tracking-wide">"The Archive" Factor</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-mono">
                <input type="radio" name="archive" checked={archive === true} onChange={() => setArchive(true)} className="w-4 h-4 text-auib-red border-auib-charcoal focus:ring-auib-red" /> Yes
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-mono">
                <input type="radio" name="archive" checked={archive === false} onChange={() => setArchive(false)} className="w-4 h-4 text-auib-red border-auib-charcoal focus:ring-auib-red" /> No
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wide">Formatting & Professionalism</label>
            <select value={formatting} onChange={e=>setFormatting(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none">
              <option value="">Select...</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>

        <div className="mt-8 space-y-4 pt-6 border-t-2 border-auib-charcoal">
          <button onClick={handleSave} disabled={saving} className="w-full bg-auib-charcoal text-auib-white font-bold uppercase tracking-widest p-4 border-2 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Rubric'}
          </button>

          <button onClick={handleDisqualify} className="w-full bg-transparent text-auib-red font-bold uppercase tracking-widest p-4 border-2 border-auib-red hover:bg-auib-red hover:text-auib-white transition-colors">
            Disqualify & Return
          </button>
        </div>
      </div>
    </div>
  );
}
