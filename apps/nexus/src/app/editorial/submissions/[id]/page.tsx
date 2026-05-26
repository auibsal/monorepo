'use client';

import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

import DOMPurify from 'isomorphic-dompurify';
import {
  AlertOctagon,
  AlertTriangle,
  CheckSquare,
  FileText,
  LayoutTemplate,
  Save,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Submission } from '@auibsal/database';

// Extend the database type to include the relational author identity and assignment
type GradingSubmission = Submission & {
  users?: { full_name: string } | null;
  assigned_to?: string | null;
};

type EditorProfile = {
  id: string;
  full_name: string;
};

export default function GradingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<GradingSubmission | null>(null);
  const [editors, setEditors] = useState<EditorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Rubric & Logistics State
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [tech, setTech] = useState<string>('');
  const [orig, setOrig] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const [archive, setArchive] = useState<boolean | null>(null);
  const [formatting, setFormatting] = useState<string>('');

  // State-driven feedback matrix
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const fetchDossierData = useCallback(async () => {
    if (!supabase) return;

    try {
      // CRITICAL FIX: Appended '!author_id' to strictly command PostgREST to follow the author relation, bypassing the assignee relation ambiguity
      const { data: subData, error: subError } = await supabase
        .from('submissions')
        .select('*, users!author_id(full_name)')
        .eq('id', submissionId)
        .single();

      if (subError) throw subError;

      if (subData) {
        // Double-cast to bypass the auto-generated PostgREST ambiguity error in the strict TS compiler
        setSubmission(subData as unknown as GradingSubmission);
        setAssignedTo(subData.assigned_to || 'unassigned');
        setTech(
          subData.rubric_technical !== undefined && subData.rubric_technical !== null
            ? String(subData.rubric_technical)
            : ''
        );
        setOrig(
          subData.rubric_originality !== undefined && subData.rubric_originality !== null
            ? String(subData.rubric_originality)
            : ''
        );
        setTheme(
          subData.rubric_thematic !== undefined && subData.rubric_thematic !== null
            ? String(subData.rubric_thematic)
            : ''
        );
        setArchive(subData.rubric_archive ?? null);
        setFormatting(subData.rubric_formatting || '');
      }

      // Fetch the Authorized Editor Roster
      const { data: editorData, error: editorError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('role', ['editor', 'admin']);

      if (editorError) throw editorError;
      if (editorData) setEditors(editorData);

    } catch (err) {
      console.error('Failed to mount secure dossier:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, submissionId]);

  useEffect(() => {
    fetchDossierData();
  }, [fetchDossierData]);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
          rubric_technical: tech ? parseInt(tech) : null,
          rubric_originality: orig ? parseInt(orig) : null,
          rubric_thematic: theme ? parseInt(theme) : null,
          rubric_archive: archive,
          rubric_formatting: formatting || null,
        })
        .eq('id', submissionId);

      if (error) throw error;
      setStatus('success');

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

    if (
      confirm(
        'CRITICAL ACTION: Are you sure you want to disqualify this submission? This will permanently update the status to "rejected", formatting to "disqualified", and unmask the author.'
      )
    ) {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rubric_formatting: 'disqualified',
        })
        .eq('id', submissionId);

      if (!error) {
        router.push('/editorial/submissions');
      }
    }
  };

  if (loading)
    return (
      <div className="flex h-[500px] items-center justify-center border-4 border-dashed border-border/20 p-12">
        <div className="flex animate-pulse items-center gap-3 text-sm font-bold tracking-widest text-foreground/50 uppercase">
          <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
          Mounting Secure Dossier...
        </div>
      </div>
    );

  if (!submission)
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 border-4 border-dashed border-red-500/30 bg-red-500/5 p-12 font-bold tracking-widest text-red-500 uppercase">
        <ShieldAlert size={48} />
        Submission Not Found.
      </div>
    );

  const totalScore =
    (tech ? parseInt(tech) : 0) + (orig ? parseInt(orig) : 0) + (theme ? parseInt(theme) : 0);

  // BLIND REVIEW LOGIC
  const isTerminalState = submission.status === 'accepted' || submission.status === 'rejected';
  const authorDisplay = isTerminalState
    ? submission.users?.full_name || 'Unknown Author'
    : 'Anonymous Manuscript';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:gap-12">
      {/* File Viewer Side */}
      <div className="flex flex-1 flex-col overflow-hidden border-4 border-border bg-card text-foreground shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
        <div className="flex items-start justify-between border-b-4 border-border bg-foreground p-6 text-background md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <FileText className="mt-1 shrink-0 text-primary md:mt-0" />
              <h2 className="max-w-[250px] truncate text-xl font-bold tracking-widest uppercase md:max-w-md">
                {submission.title}
              </h2>
            </div>
            <div
              className={`mt-3 flex items-center gap-2 text-xs font-bold tracking-wider uppercase ${
                isTerminalState ? 'text-primary' : 'text-background/50'
              }`}
            >
              <User size={14} />
              <span className="truncate">{authorDisplay}</span>
            </div>
          </div>
          <span className="border-2 border-transparent bg-background px-3 py-1.5 text-xs font-bold tracking-wider text-foreground uppercase shadow-[2px_2px_0px_0px_var(--primary)] md:text-sm">
            {submission.type}
          </span>
        </div>

        <div className="relative flex min-h-[700px] flex-1 flex-col items-center justify-start gap-8 overflow-y-auto bg-foreground/5 p-6 md:p-12">
          {submission.content && (
            <div className="prose prose-lg dark:prose-invert w-full max-w-4xl border-4 border-border bg-card p-8 text-foreground shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] md:p-16">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.content) }} />
            </div>
          )}

          {submission.file_url && (
            <div className="flex w-full items-center justify-center">
              {submission.file_url.endsWith('.pdf') ? (
                <iframe
                  src={submission.file_url}
                  className="h-[800px] w-full border-4 border-border bg-background shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]"
                />
              ) : (
                <Image
                  unoptimized
                  width={1200}
                  height={800}
                  src={submission.file_url}
                  alt="Submission Attachment"
                  className="max-h-[800px] max-w-full border-4 border-border bg-card object-contain p-2 shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]"
                />
              )}
            </div>
          )}

          {!submission.content && !submission.file_url && (
            <div className="mt-32 flex h-full w-full flex-col items-center justify-center gap-4 font-bold tracking-widest text-foreground/40 uppercase">
              <LayoutTemplate size={64} />
              No manuscript or file attached.
            </div>
          )}
        </div>
      </div>

      {/* Grading Rubric Side Panel */}
      <div className="flex h-fit w-full flex-col border-4 border-border bg-card p-8 text-foreground shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] lg:w-[400px]">
        <div className="mb-8 flex items-center justify-between border-b-4 border-border pb-6">
          <h3 className="text-2xl font-bold tracking-widest text-foreground uppercase">Rubric</h3>
          <div className="border-4 border-border bg-foreground px-4 py-2 text-xl font-black text-background shadow-[4px_4px_0px_0px_var(--primary)]">
            {totalScore} / 60
          </div>
        </div>

        <div className="flex-1 space-y-8">

          {/* Assignment Task Module */}
          <div className="space-y-3 border-b-4 border-border/10 pb-8">
            <label className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
              <ShieldCheck size={18} className="text-primary" />
              Assigned Editor
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full cursor-pointer rounded-none border-4 border-border bg-background p-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 focus:border-primary focus:outline-none"
            >
              <option value="unassigned">-- Unassigned --</option>
              {editors.map((editor) => (
                <option key={editor.id} value={editor.id}>
                  {editor.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold tracking-wide uppercase">
              Technical Command & Craft
            </label>
            <select
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              className="w-full cursor-pointer rounded-none border-4 border-border bg-background p-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 focus:border-primary focus:outline-none"
            >
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold tracking-wide uppercase">
              Originality & Voice
            </label>
            <select
              value={orig}
              onChange={(e) => setOrig(e.target.value)}
              className="w-full cursor-pointer rounded-none border-4 border-border bg-background p-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 focus:border-primary focus:outline-none"
            >
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold tracking-wide uppercase">
              Thematic Depth & Resonance
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full cursor-pointer rounded-none border-4 border-border bg-background p-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 focus:border-primary focus:outline-none"
            >
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-4 border-t-4 border-border/10 pt-6">
            <label className="block text-sm font-bold tracking-wide uppercase">
              "The Archive" Factor
            </label>
            <div className="flex gap-8">
              <label className="group flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="archive"
                  checked={archive === true}
                  onChange={() => setArchive(true)}
                  className="h-6 w-6 border-4 border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm font-bold tracking-widest uppercase transition-colors group-hover:text-primary">
                  Yes
                </span>
              </label>
              <label className="group flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="archive"
                  checked={archive === false}
                  onChange={() => setArchive(false)}
                  className="h-6 w-6 border-4 border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm font-bold tracking-widest uppercase transition-colors group-hover:text-primary">
                  No
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold tracking-wide uppercase">
              Formatting & Professionalism
            </label>
            <select
              value={formatting}
              onChange={(e) => setFormatting(e.target.value)}
              className="w-full cursor-pointer rounded-none border-4 border-border bg-background p-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 focus:border-primary focus:outline-none"
            >
              <option value="">Select Protocol...</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>

        {/* System Feedback Matrix */}
        <div className="mt-8 space-y-4">
          {status === 'error' && (
            <div className="flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
              <AlertTriangle size={20} className="flex-shrink-0" />
              <span className="break-words">{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-3 border-4 border-green-500 bg-background p-4 text-sm font-bold text-green-500">
              <CheckSquare size={20} className="flex-shrink-0" />
              <span>Rubric successfully synchronized.</span>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-6 border-t-4 border-border pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-3 border-4 border-border bg-foreground p-5 font-bold tracking-widest text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-none bg-background"></div>
                Transmitting...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Rubric
              </>
            )}
          </button>

          <button
            onClick={handleDisqualify}
            className="flex w-full items-center justify-center gap-3 border-4 border-red-500 bg-card p-5 font-bold tracking-widest text-red-500 uppercase shadow-[6px_6px_0px_0px_var(--primary)] transition-all hover:-translate-y-1 hover:bg-red-500 hover:text-white hover:shadow-[8px_8px_0px_0px_var(--primary)]"
          >
            <AlertOctagon size={20} />
            Disqualify & Return
          </button>
        </div>
      </div>
    </div>
  );
}
