'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from '@auibsal/auth/client';
import { Submission } from '@auibsal/database';
import DOMPurify from 'isomorphic-dompurify';
import { Save, AlertOctagon, FileText, LayoutTemplate, ShieldAlert, CheckSquare, AlertTriangle } from 'lucide-react';

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
  
  // Replaced native alerts with state-driven feedback
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
    setStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase.from('submissions').update({
        rubric_technical: tech ? parseInt(tech) : null,
        rubric_originality: orig ? parseInt(orig) : null,
        rubric_thematic: theme ? parseInt(theme) : null,
        rubric_archive: archive,
        rubric_formatting: formatting || null,
      }).eq('id', submissionId);

      if (error) throw error;
      setStatus('success');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'System failed to sync rubric data.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisqualify = async () => {
    if (!supabase) return;
    // Keeping native confirm here serves as an intentional, high-friction interrupt for a destructive action
    if (confirm('CRITICAL ACTION: Are you sure you want to disqualify this submission? This will permanently update the status to "rejected" and formatting to "disqualified".')) {
      const { error } = await supabase.from('submissions').update({
        status: 'rejected',
        rubric_formatting: 'disqualified',
      }).eq('id', submissionId);

      if (!error) {
        // Enforce boundary routing relative to the current working perimeter
        router.push('/editorial/submissions');
      }
    }
  };

  if (loading) return (
    <div className="p-12 font-bold uppercase tracking-widest text-foreground/50 flex items-center justify-center h-96 border-4 border-dashed border-border/20">
      Loading Dossier...
    </div>
  );

  if (!submission) return (
    <div className="p-12 font-bold uppercase tracking-widest text-red-500 flex flex-col items-center justify-center gap-4 h-96 border-4 border-dashed border-red-500/30 bg-red-500/5">
      <ShieldAlert size={48} />
      Submission Not Found.
    </div>
  );

  const totalScore = (tech ? parseInt(tech) : 0) + (orig ? parseInt(orig) : 0) + (theme ? parseInt(theme) : 0);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
      
      {/* File Viewer Side */}
      <div className="flex-1 bg-card text-foreground border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] flex flex-col overflow-hidden">
        
        {/* Document Header fully inverted */}
        <div className="p-6 border-b-4 border-border flex justify-between items-center bg-foreground text-background">
          <div className="flex items-center gap-3">
            <FileText className="text-primary" />
            <h2 className="text-xl font-bold uppercase tracking-widest truncate max-w-[300px] md:max-w-md">{submission.title}</h2>
          </div>
          <span className="text-sm font-bold bg-background text-foreground px-3 py-1.5 uppercase tracking-wider border-2 border-transparent shadow-[2px_2px_0px_0px_var(--primary)]">
            {submission.type}
          </span>
        </div>

        {/* Document Body */}
        <div className="flex-1 min-h-[700px] p-6 md:p-12 bg-foreground/5 flex flex-col items-center justify-start overflow-y-auto gap-8 relative">
          
          {submission.content && (
            // ⚡ Bolt Optimization: Added dark:prose-invert to support typographic swapping
            <div className="w-full p-8 md:p-16 bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] prose prose-lg dark:prose-invert max-w-4xl text-foreground">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.content) }} />
            </div>
          )}

          {submission.file_url && (
            <div className="w-full flex justify-center items-center">
              {submission.file_url.endsWith('.pdf') ? (
                <iframe src={submission.file_url} className="w-full h-[800px] border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] bg-background" />
              ) : (
                <Image unoptimized width={1200} height={800} src={submission.file_url} alt="Submission Attachment" className="max-w-full max-h-[800px] object-contain border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] bg-card p-2" />
              )}
            </div>
          )}

          {!submission.content && !submission.file_url && (
            <div className="flex flex-col items-center justify-center h-full w-full font-bold uppercase tracking-widest text-foreground/40 gap-4 mt-32">
              <LayoutTemplate size={64} />
              No manuscript or file attached.
            </div>
          )}
        </div>
      </div>

      {/* Grading Rubric Side Panel */}
      <div className="w-full lg:w-[400px] bg-card p-8 border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] text-foreground flex flex-col h-fit">
        
        <div className="flex justify-between items-center border-b-4 border-border pb-6 mb-8">
          <h3 className="text-2xl font-bold uppercase tracking-widest text-foreground">Rubric</h3>
          <div className="bg-foreground text-background font-black text-xl px-4 py-2 border-4 border-border shadow-[4px_4px_0px_0px_var(--primary)]">
            {totalScore} / 60
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Technical Command & Craft</label>
            <select value={tech} onChange={e=>setTech(e.target.value)} className="w-full p-4 border-4 border-border bg-background text-foreground focus:outline-none focus:border-primary rounded-none font-bold text-sm cursor-pointer hover:bg-foreground/5 transition-colors">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Originality & Voice</label>
            <select value={orig} onChange={e=>setOrig(e.target.value)} className="w-full p-4 border-4 border-border bg-background text-foreground focus:outline-none focus:border-primary rounded-none font-bold text-sm cursor-pointer hover:bg-foreground/5 transition-colors">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Thematic Depth & Resonance</label>
            <select value={theme} onChange={e=>setTheme(e.target.value)} className="w-full p-4 border-4 border-border bg-background text-foreground focus:outline-none focus:border-primary rounded-none font-bold text-sm cursor-pointer hover:bg-foreground/5 transition-colors">
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-4 pt-6 border-t-4 border-border/10">
            <label className="block text-sm font-bold uppercase tracking-wide">"The Archive" Factor</label>
            <div className="flex gap-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="archive" checked={archive === true} onChange={() => setArchive(true)} className="w-6 h-6 text-primary border-4 border-border focus:ring-primary focus:ring-offset-0 bg-background" /> 
                <span className="font-bold uppercase tracking-widest text-sm group-hover:text-primary transition-colors">Yes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name="archive" checked={archive === false} onChange={() => setArchive(false)} className="w-6 h-6 text-primary border-4 border-border focus:ring-primary focus:ring-offset-0 bg-background" /> 
                <span className="font-bold uppercase tracking-widest text-sm group-hover:text-primary transition-colors">No</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">Formatting & Professionalism</label>
            <select value={formatting} onChange={e=>setFormatting(e.target.value)} className="w-full p-4 border-4 border-border bg-background text-foreground focus:outline-none focus:border-primary rounded-none font-bold text-sm cursor-pointer hover:bg-foreground/5 transition-colors">
              <option value="">Select Protocol...</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>

        {/* System Feedback Matrix */}
        <div className="mt-8 space-y-4">
          {status === 'error' && (
            <div className="p-4 border-4 border-red-500 bg-background text-red-500 font-bold text-sm flex items-center gap-3">
              <AlertTriangle size={20} className="flex-shrink-0" />
              <span className="break-words">{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="p-4 border-4 border-green-500 bg-background text-green-500 font-bold text-sm flex items-center gap-3">
              <CheckSquare size={20} className="flex-shrink-0" />
              <span>Rubric successfully synchronized.</span>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-6 pt-8 border-t-4 border-border">
          <button onClick={handleSave} disabled={saving} className="w-full bg-foreground text-background font-bold uppercase tracking-widest p-5 border-4 border-border hover:bg-primary hover:border-primary transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1">
            {saving ? (
              <>
                <div className="w-4 h-4 bg-background rounded-none animate-spin"></div>
                Transmitting...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Rubric
              </>
            )}
          </button>

          <button onClick={handleDisqualify} className="w-full bg-card text-red-500 font-bold uppercase tracking-widest p-5 border-4 border-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_var(--primary)] hover:shadow-[8px_8px_0px_0px_var(--primary)] hover:-translate-y-1">
            <AlertOctagon size={20} />
            Disqualify & Return
          </button>
        </div>
      </div>
    </div>
  );
}
