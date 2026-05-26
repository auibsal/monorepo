'use client';

import { useCallback, useEffect, useState } from 'react';

import { AlertTriangle, Plus, X } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { BlogPost } from '@auibsal/database';
import { RichTextEditor } from '@auibsal/ui/components/RichTextEditor';

// Strictly define the shape of the Supabase relational join
type CMSPostRecord = Pick<BlogPost, 'id' | 'title_en' | 'title_ar'> & {
  users: { full_name: string } | null;
};

export default function BlogPage() {
  const [posts, setPosts] = useState<CMSPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [slug, setSlug] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  // CRITICAL FIX: Wrapped in useCallback to satisfy strict React concurrency rules
  const fetchPosts = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title_en, title_ar, users(full_name)')
      .order('published_at', { ascending: false });

    if (!error && data) {
      setPosts(data as unknown as CMSPostRecord[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCancel = () => {
    setTitleEn('');
    setTitleAr('');
    setContentEn('');
    setContentAr('');
    setSlug('');
    setErrorMessage('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!supabase) return;

    // CRITICAL FIX: Explicitly block blank RichText payloads from reaching the database
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim();
    if (!stripHtml(contentEn) || !stripHtml(contentAr)) {
      setErrorMessage('Both English and Arabic content payloads are strictly required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication failure. Session may have expired.');

      const finalSlug =
        slug.trim() !== ''
          ? slug.trim()
          : titleEn
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '');

      const { error } = await supabase.from('blog_posts').insert({
        author_id: user.id,
        title_en: titleEn,
        title_ar: titleAr,
        content_en: contentEn,
        content_ar: contentAr,
        slug: finalSlug,
        cover_image_url: '', // Image mount point reserved for future iterations
      });

      if (error) throw error;

      handleCancel();
      fetchPosts();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unknown exception occurred during transmission.'
      );
    }

    setIsSaving(false);
  };

  return (
    <div>
      {/* Architectural Header anchored to dynamic tokens */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold tracking-widest text-foreground uppercase">Blog CMS</h2>
        <button
          onClick={showForm ? handleCancel : () => setShowForm(true)}
          className={`flex items-center gap-2 border-4 border-border px-6 py-2 font-bold tracking-wider uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] ${
            showForm
              ? 'bg-background text-foreground hover:border-primary hover:text-primary'
              : 'bg-primary text-background hover:bg-background hover:text-primary'
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Brutalist Data Table */}
      {!showForm && (
        <div className="mb-12 overflow-x-auto border-4 border-border bg-card text-foreground shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
          <table className="w-full border-collapse text-left">
            <thead className="border-b-4 border-border bg-foreground text-background">
              <tr>
                <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">Title (EN)</th>
                <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">Title (AR)</th>
                <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">Author</th>
                <th className="px-6 py-4 text-right text-sm font-bold tracking-wide uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8">
                    {/* CRITICAL FIX: Standardized Brutalist Loading State */}
                    <div className="flex animate-pulse items-center justify-center gap-3 text-sm font-bold tracking-widest text-foreground/50 uppercase">
                      <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
                      Polling CMS Database...
                    </div>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm font-bold tracking-widest text-foreground/50 uppercase"
                  >
                    No posts found in the matrix.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-foreground/5">
                    <td className="px-6 py-4 text-sm font-bold">{post.title_en}</td>
                    <td className="px-6 py-4 text-sm font-bold">{post.title_ar}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {post.users?.full_name || 'Unknown Author'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className="border-2 border-primary bg-primary/10 px-3 py-1.5 text-xs font-bold tracking-wider text-primary uppercase shadow-[2px_2px_0px_0px_var(--primary)]">
                        Published
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Draft Post Form */}
      {showForm && (
        <div className="max-w-6xl border-4 border-border bg-card p-8 text-foreground shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:p-12">
          <h3 className="mb-8 border-b-4 border-border pb-4 text-2xl font-bold tracking-widest uppercase">
            Draft New Post
          </h3>

          {errorMessage && (
            <div className="mb-8 flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
              <AlertTriangle size={20} className="flex-shrink-0" />
              <span className="break-words">{errorMessage}</span>
            </div>
          )}

          <div className="mb-8">
            <label className="mb-3 block text-sm font-bold tracking-wide text-foreground uppercase">
              Slug (optional, auto-generated from Title EN if empty)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-none border-4 border-border bg-background p-4 font-mono text-sm text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none md:w-1/2"
            />
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-bold tracking-wide text-foreground uppercase">
                  Title (English) <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-3 block text-sm font-bold tracking-wide text-foreground uppercase">
                  Content (English) <span className="text-primary">*</span>
                </label>
                <div className="border-4 border-border bg-background transition-colors focus-within:border-primary">
                  <RichTextEditor content={contentEn} onChange={setContentEn} />
                </div>
              </div>
            </div>
            <div className="space-y-6" dir="rtl">
              <div>
                <label className="mb-3 block text-right text-sm font-bold tracking-wide text-foreground uppercase">
                  العنوان (عربي) <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  className="w-full rounded-none border-4 border-border bg-background p-4 font-bold text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-3 block text-right text-sm font-bold tracking-wide text-foreground uppercase">
                  المحتوى (عربي) <span className="text-primary">*</span>
                </label>
                <div
                  className="border-4 border-border bg-background text-right transition-colors focus-within:border-primary"
                  dir="rtl"
                >
                  <RichTextEditor content={contentAr} onChange={setContentAr} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex justify-end">
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-3 border-4 border-border bg-foreground px-8 py-4 font-bold tracking-wider text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
            >
              {isSaving && <div className="h-4 w-4 animate-spin rounded-none bg-background"></div>}
              {isSaving ? 'Transmitting Payload...' : 'Publish Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
