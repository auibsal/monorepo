'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from 'auth/client';
import { Submission } from 'database';
import DOMPurify from 'isomorphic-dompurify';
import { Save, AlertOctagon, FileText, LayoutTemplate, ShieldAlert } from 'lucide-react';

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

  const supabase = createClient();

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
    if (confirm('CRITICAL ACTION: Are you sure you want to disqualify this submission? This will permanently update the status to "rejected" and formatting to "disqualified".')) {
      const { error } = await supabase.from('submissions').update({
        status: 'rejected',
        rubric_formatting: 'disqualified',
      }).eq('id', submissionId);

      if (!error) {
        router.push('/submissions');
      }
    }
  };

  if (loading) return (
    <div className="p-12 font-bold uppercase tracking-widest text-auib-charcoal/50 flex items-center justify-center h-96 border-4 border-dashed border-auib-charcoal/20">
      Loading Dossier...
    </div>
  );

  if (!submission) return (
    <div className="p-12 font-bold uppercase tracking-widest text-auib-red flex flex-col items-center justify-center gap-4 h-96 border-4 border-dashed border-auib-red/30 bg-auib-red/5">
      <ShieldAlert size={48} />
      Submission Not Found.
    </div>
  );

  const totalScore = (tech ? parseInt(tech) : 0) + (orig ? parseInt(orig) : 0) + (theme ? parseInt(theme) : 0);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
      
      {/* File Viewer Side */}
      <div className="flex-1 bg-white text-auib-charcoal border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] flex flex-col overflow-hidden">
        
        {/* Document Header */}
        <div className="p-6 border-b-4 border-auib-charcoal flex justify-between items-center bg-auib-charcoal text-white">
          <div className="flex items-center gap-3">
            <FileText className="text-auib-red" />
            <h2 className="text-xl font-bold uppercase tracking-widest truncate max-w-[300px] md:max-w-md">{submission.title}</h2>
          </div>
          <span className="text-sm font-bold bg-white text-auib-charcoal px-3 py-1.5 uppercase tracking-wider border-2 border-transparent shadow-[2px_2px_0px_0px_#9C213E]">
            {submission.type}
          </span>
        </div>

        {/* Document Body */}
        <div className="flex-1 min-h-[700px] p-6 md:p-12 bg-auib-charcoal/5 flex flex-col items-center justify-start overflow-y-auto gap-8 relative">
          
          {submission.content && (
            <div className="w-full p-8 md:p-16 bg-white border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] prose prose-lg max-w-4xl text-auib-charcoal">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.content) }} />
            </div>
          )}

          {submission.file_url && (
            <div className="w-full flex justify-center items-center">
              {submission.file_url.endsWith('.pdf') ? (
                <iframe src={submission.file_url} className="w-full h-[800px] border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] bg-white" />
              ) : (
                <Image unoptimized width={1200} height={800} src={submission.file_url} alt="Submission Attachment" className="max-w-full max-h-[800px] object-contain border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] bg-white p-2" />
              )}
            </div>
          )}

          {!submission.content && !submission.file_url && (
            <div className="flex flex-col items-center justify-center h-full w-full font-bold uppercase tracking-widest text-auib-charcoal/40 gap-4 mt-32">
              <LayoutTemplate size={64} />
              No manuscript or file attached.
            </div>
          )}
        </div>
      </div>

      {/* Grading Rubric Side Panel */}
      <div className="w-full lg:w-[400px] bg-white p-8 border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] text-auib-charcoal flex flex-col h-fit">
        
        <div className="flex justify-between items-center border-b-4 border-auib-charcoal pb-6 mb-8">
          <h3 className="text-2xl font-bold uppercase tracking-widest text-auib-charcoal">Rubric</h3>
          <div className="bg-auib-charcoal text-white font-black text-xl px-4 py-2 border-4 border-auib-charcoal shadow-[4px_4px_0px_0px_#9C213E]">
            {totalScore} / 60
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Technical Command & Craft</label>
            <select value={tech} onChange={e=>setTech(e.target.value)} className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red rounded-none font-bold text-sm cursor-pointer hover:bg-auib-charcoal/5 transition-colors">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Originality & Voice</label>
            <select value={orig} onChange={e=>setOrig(e.target.value)} className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red rounded-none font-bold text-sm cursor-pointer hover:bg-auib-charcoal/5 transition-colors">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Thematic Depth & Resonance</label>
            <select value={theme} onChange={e=>setTheme(e.target.value)} className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red rounded-none font-bold text-sm cursor-pointer hover:bg-auib-charcoal/5 transition-colors">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-4 pt-6 border-t-4 border-auib-charcoal/10">
            <label className="block text-sm font-bold uppercase tracking-wide">"The Archive" Factor</label>
            <div className="flex gap-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="archive" checked={archive === true} onChange={() => setArchive(true)} className="w-6 h-6 text-auib-red border-4 border-auib-charcoal focus:ring-auib-red focus:ring-offset-0" /> 
                <span className="font-bold uppercase tracking-widest text-sm group-hover:text-auib-red transition-colors">Yes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="archive" checked={archive === false} onChange={() => setArchive(false)} className="w-6 h-6 text-auib-red border-4 border-auib-charcoal focus:ring-auib-red focus:ring-offset-0" /> 
                <span className="font-bold uppercase tracking-widest text-sm group-hover:text-auib-red transition-colors">No</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Formatting & Professionalism</label>
            <select value={formatting} onChange={e=>setFormatting(e.target.value)} className="w-full p-4 border-4 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red rounded-none font-bold text-sm cursor-pointer hover:bg-auib-charcoal/5 transition-colors">
              <option value="">Select Protocol...</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>

        <div className="mt-12 space-y-6 pt-8 border-t-4 border-auib-charcoal">
          <button onClick={handleSave} disabled={saving} className="w-full bg-auib-charcoal text-white font-bold uppercase tracking-widest p-5 border-4 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-1">
            <Save size={20} />
            {saving ? 'Saving to Database...' : 'Save Rubric'}
          </button>

          <button onClick={handleDisqualify} className="w-full bg-white text-auib-red font-bold uppercase tracking-widest p-5 border-4 border-auib-red hover:bg-auib-red hover:text-white transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_#9C213E] hover:shadow-[8px_8px_0px_0px_#9C213E] hover:-translate-y-1">
            <AlertOctagon size={20} />
            Disqualify & Return
          </button>
        </div>
      </div>
    </div>
  );
}
