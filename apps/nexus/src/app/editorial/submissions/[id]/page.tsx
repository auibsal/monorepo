'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

import DOMPurify from 'isomorphic-dompurify';
import { AlertOctagon, FileText, LayoutTemplate, Save, ShieldAlert } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Submission } from '@auibsal/database';

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
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      if (data) {
        setSubmission(data);
        setTech(
          data.rubric_technical !== undefined && data.rubric_technical !== null
            ? String(data.rubric_technical)
            : ''
        );
        setOrig(
          data.rubric_originality !== undefined && data.rubric_originality !== null
            ? String(data.rubric_originality)
            : ''
        );
        setTheme(
          data.rubric_thematic !== undefined && data.rubric_thematic !== null
            ? String(data.rubric_thematic)
            : ''
        );
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
    const { error } = await supabase
      .from('submissions')
      .update({
        rubric_technical: tech ? parseInt(tech) : null,
        rubric_originality: orig ? parseInt(orig) : null,
        rubric_thematic: theme ? parseInt(theme) : null,
        rubric_archive: archive,
        rubric_formatting: formatting || null,
      })
      .eq('id', submissionId);

    setSaving(false);
    if (!error) {
      alert('Rubric saved successfully.');
    } else {
      alert('Error saving rubric: ' + error.message);
    }
  };

  const handleDisqualify = async () => {
    if (!supabase) return;
    if (
      confirm(
        'CRITICAL ACTION: Are you sure you want to disqualify this submission? This will permanently update the status to "rejected" and formatting to "disqualified".'
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
        router.push('/submissions');
      }
    }
  };

  if (loading)
    return (
      <div className="text-auib-charcoal/50 border-auib-charcoal/20 flex h-96 items-center justify-center border-4 border-dashed p-12 font-bold uppercase tracking-widest">
        Loading Dossier...
      </div>
    );

  if (!submission)
    return (
      <div className="text-auib-red border-auib-red/30 bg-auib-red/5 flex h-96 flex-col items-center justify-center gap-4 border-4 border-dashed p-12 font-bold uppercase tracking-widest">
        <ShieldAlert size={48} />
        Submission Not Found.
      </div>
    );

  const totalScore =
    (tech ? parseInt(tech) : 0) + (orig ? parseInt(orig) : 0) + (theme ? parseInt(theme) : 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:gap-12">
      {/* File Viewer Side */}
      <div className="text-auib-charcoal border-auib-charcoal flex flex-1 flex-col overflow-hidden border-4 bg-white shadow-[12px_12px_0px_0px_#273237]">
        {/* Document Header */}
        <div className="border-auib-charcoal bg-auib-charcoal flex items-center justify-between border-b-4 p-6 text-white">
          <div className="flex items-center gap-3">
            <FileText className="text-auib-red" />
            <h2 className="max-w-[300px] truncate text-xl font-bold uppercase tracking-widest md:max-w-md">
              {submission.title}
            </h2>
          </div>
          <span className="text-auib-charcoal border-2 border-transparent bg-white px-3 py-1.5 text-sm font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_#9C213E]">
            {submission.type}
          </span>
        </div>

        {/* Document Body */}
        <div className="bg-auib-charcoal/5 relative flex min-h-[700px] flex-1 flex-col items-center justify-start gap-8 overflow-y-auto p-6 md:p-12">
          {submission.content && (
            <div className="border-auib-charcoal prose prose-lg text-auib-charcoal w-full max-w-4xl border-4 bg-white p-8 shadow-[8px_8px_0px_0px_#273237] md:p-16">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.content) }} />
            </div>
          )}

          {submission.file_url && (
            <div className="flex w-full items-center justify-center">
              {submission.file_url.endsWith('.pdf') ? (
                <iframe
                  src={submission.file_url}
                  className="border-auib-charcoal h-[800px] w-full border-4 bg-white shadow-[8px_8px_0px_0px_#273237]"
                />
              ) : (
                <Image
                  unoptimized
                  width={1200}
                  height={800}
                  src={submission.file_url}
                  alt="Submission Attachment"
                  className="border-auib-charcoal max-h-[800px] max-w-full border-4 bg-white object-contain p-2 shadow-[8px_8px_0px_0px_#273237]"
                />
              )}
            </div>
          )}

          {!submission.content && !submission.file_url && (
            <div className="text-auib-charcoal/40 mt-32 flex h-full w-full flex-col items-center justify-center gap-4 font-bold uppercase tracking-widest">
              <LayoutTemplate size={64} />
              No manuscript or file attached.
            </div>
          )}
        </div>
      </div>

      {/* Grading Rubric Side Panel */}
      <div className="border-auib-charcoal text-auib-charcoal flex h-fit w-full flex-col border-4 bg-white p-8 shadow-[12px_12px_0px_0px_#273237] lg:w-[400px]">
        <div className="border-auib-charcoal mb-8 flex items-center justify-between border-b-4 pb-6">
          <h3 className="text-auib-charcoal text-2xl font-bold uppercase tracking-widest">
            Rubric
          </h3>
          <div className="bg-auib-charcoal border-auib-charcoal border-4 px-4 py-2 text-xl font-black text-white shadow-[4px_4px_0px_0px_#9C213E]">
            {totalScore} / 60
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">
              Technical Command & Craft
            </label>
            <select
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              className="border-auib-charcoal focus:border-auib-red hover:bg-auib-charcoal/5 w-full cursor-pointer rounded-none border-4 bg-white p-4 text-sm font-bold transition-colors focus:outline-none"
            >
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">
              Originality & Voice
            </label>
            <select
              value={orig}
              onChange={(e) => setOrig(e.target.value)}
              className="border-auib-charcoal focus:border-auib-red hover:bg-auib-charcoal/5 w-full cursor-pointer rounded-none border-4 bg-white p-4 text-sm font-bold transition-colors focus:outline-none"
            >
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">
              Thematic Depth & Resonance
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="border-auib-charcoal focus:border-auib-red hover:bg-auib-charcoal/5 w-full cursor-pointer rounded-none border-4 bg-white p-4 text-sm font-bold transition-colors focus:outline-none"
            >
              <option value="">Select Score...</option>
              <option value="20">20 - Exceptional</option>
              <option value="10">10 - Proficient</option>
              <option value="0">0 - Needs Work</option>
            </select>
          </div>

          <div className="border-auib-charcoal/10 space-y-4 border-t-4 pt-6">
            <label className="block text-sm font-bold uppercase tracking-wide">
              &quot;The Archive&quot; Factor
            </label>
            <div className="flex gap-8">
              <label className="group flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="archive"
                  checked={archive === true}
                  onChange={() => setArchive(true)}
                  className="text-auib-red border-auib-charcoal focus:ring-auib-red h-6 w-6 border-4 focus:ring-offset-0"
                />
                <span className="group-hover:text-auib-red text-sm font-bold uppercase tracking-widest transition-colors">
                  Yes
                </span>
              </label>
              <label className="group flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="archive"
                  checked={archive === false}
                  onChange={() => setArchive(false)}
                  className="text-auib-red border-auib-charcoal focus:ring-auib-red h-6 w-6 border-4 focus:ring-offset-0"
                />
                <span className="group-hover:text-auib-red text-sm font-bold uppercase tracking-widest transition-colors">
                  No
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wide">
              Formatting & Professionalism
            </label>
            <select
              value={formatting}
              onChange={(e) => setFormatting(e.target.value)}
              className="border-auib-charcoal focus:border-auib-red hover:bg-auib-charcoal/5 w-full cursor-pointer rounded-none border-4 bg-white p-4 text-sm font-bold transition-colors focus:outline-none"
            >
              <option value="">Select Protocol...</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
        </div>

        <div className="border-auib-charcoal mt-12 space-y-6 border-t-4 pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-auib-charcoal border-auib-charcoal hover:bg-auib-red hover:border-auib-red flex w-full items-center justify-center gap-3 border-4 p-5 font-bold uppercase tracking-widest text-white shadow-[6px_6px_0px_0px_#273237] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#273237] disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving to Database...' : 'Save Rubric'}
          </button>

          <button
            onClick={handleDisqualify}
            className="text-auib-red border-auib-red hover:bg-auib-red flex w-full items-center justify-center gap-3 border-4 bg-white p-5 font-bold uppercase tracking-widest shadow-[6px_6px_0px_0px_#9C213E] transition-all hover:-translate-y-1 hover:text-white hover:shadow-[8px_8px_0px_0px_#9C213E]"
          >
            <AlertOctagon size={20} />
            Disqualify & Return
          </button>
        </div>
      </div>
    </div>
  );
}
