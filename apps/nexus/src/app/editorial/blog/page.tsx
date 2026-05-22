'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { RichTextEditor } from '@auibsal/ui/components/RichTextEditor';
import { BlogPost } from "@auibsal/database";
import { AlertTriangle } from 'lucide-react';

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
  // Replaced native alert with state-driven error handling
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title_en, title_ar, users(full_name)')
      .order('published_at', { ascending: false });
      
    if (!error && data) {
      // Cast safely to our explicit interface rather than 'any'
      setPosts(data as unknown as CMSPostRecord[]);
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setTitleEn(''); setTitleAr(''); setContentEn(''); setContentAr(''); setSlug('');
    setErrorMessage('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!supabase) return;
    setIsSaving(true);
    setErrorMessage('');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication failure. Session may have expired.");

        const finalSlug = slug.trim() !== '' ? slug.trim() : titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const { error } = await supabase.from('blog_posts').insert({
            author_id: user.id,
            title_en: titleEn,
            title_ar: titleAr,
            content_en: contentEn,
            content_ar: contentAr,
            slug: finalSlug,
            cover_image_url: '', 
        });

        if (error) throw error;

        handleCancel();
        fetchPosts();

    } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'An unknown exception occurred during transmission.');
    }

    setIsSaving(false);
  };

  return (
    <div>
      {/* Architectural Header anchored to dynamic tokens */}
      <div className="flex justify-between items-center mb-10 border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground">Blog CMS</h2>
        <button
            onClick={showForm ? handleCancel : () => setShowForm(true)}
            className="bg-primary text-background font-bold uppercase tracking-wider px-6 py-2 border-4 border-border hover:bg-background hover:text-primary transition-colors shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-0.5">
            {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Brutalist Data Table */}
      {!showForm && (
        <div className="bg-card text-foreground border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] overflow-x-auto mb-12">
            <table className="w-full text-left border-collapse">
            <thead className="border-b-4 border-border bg-foreground text-background">
                <tr>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Title (EN)</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Title (AR)</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Author</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide text-right">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y-2 divide-border">
                {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-foreground/70">Loading posts...</td></tr>
                ) : posts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-foreground/70">No posts found.</td></tr>
                ) : posts.map(post => (
                <tr key={post.id} className="hover:bg-foreground/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold">{post.title_en}</td>
                  <td className="px-6 py-4 text-sm font-bold">{post.title_ar}</td>
                  {/* Extracting relation property safely */}
                  <td className="px-6 py-4 text-sm font-medium">{post.users?.full_name || 'Unknown Author'}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className="bg-primary text-background py-1.5 px-3 font-bold uppercase text-xs tracking-wider border-2 border-border shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">Published</span>
                  </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}

      {/* Draft Post Form */}
      {showForm && (
        <div className="bg-card text-foreground p-8 md:p-12 border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] max-w-6xl">
            <h3 className="text-2xl font-bold mb-8 uppercase tracking-widest border-b-4 border-border pb-4">Draft New Post</h3>

            {errorMessage && (
              <div className="mb-8 p-4 border-4 border-red-500 bg-background text-red-500 text-sm font-bold flex items-center gap-3">
                <AlertTriangle size={20} className="flex-shrink-0" />
                <span className="break-words">{errorMessage}</span>
              </div>
            )}

            <div className="mb-8">
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">Slug (optional, auto-generated from Title EN if empty)</label>
                <input type="text" value={slug} onChange={e=>setSlug(e.target.value)} className="w-full md:w-1/2 p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-mono text-sm text-foreground" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">Title (English)</label>
                <input type="text" required value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground" />
                </div>
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3">Content (English)</label>
                {/* Wrapped in a border context to ensure focus-states map to semantic variables */}
                <div className="border-2 border-border focus-within:border-primary transition-colors bg-background">
                  <RichTextEditor content={contentEn} onChange={setContentEn} />
                </div>
                </div>
            </div>
            <div className="space-y-6" dir="rtl">
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3 text-right">العنوان (عربي)</label>
                <input type="text" required value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none font-bold text-foreground" />
                </div>
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-foreground mb-3 text-right">المحتوى (عربي)</label>
                <div className="border-2 border-border focus-within:border-primary transition-colors bg-background text-right" dir="rtl">
                  <RichTextEditor content={contentAr} onChange={setContentAr} />
                </div>
                </div>
            </div>
            </div>
            <div className="mt-12 flex justify-end">
                <button disabled={isSaving} onClick={handleSave} className="bg-foreground text-background font-bold uppercase tracking-wider px-8 py-4 border-4 border-border hover:bg-primary hover:border-primary transition-colors shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50 hover:-translate-y-1">
                    {isSaving ? 'Saving...' : 'Publish Post'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
