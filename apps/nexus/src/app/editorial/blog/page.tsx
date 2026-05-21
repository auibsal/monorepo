'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@auibsal/auth/client';
import { BlogPost } from '@auibsal/database';
import { RichTextEditor } from '@auibsal/ui';

export default function BlogPage() {
  const [posts, setPosts] = useState<(BlogPost & { users: { full_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [slug, setSlug] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    if (!supabase) return;
    // ⚡ Bolt Performance Optimization: Explicitly select only the required fields to prevent over-fetching large rich-text 'content_en' and 'content_ar' fields.
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title_en, title_ar, users(full_name)')
      .order('published_at', { ascending: false });
    if (!error && data) {
      setPosts(data as any);
    }
    setLoading(false);
  };

  // CRITICAL: Dedicated cancel handler to prevent state memory leaks
  const handleCancel = () => {
    setTitleEn('');
    setTitleAr('');
    setContentEn('');
    setContentAr('');
    setSlug('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!supabase) return;
    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Autogenerate slug if empty
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
        cover_image_url: '',
      });

      if (error) throw error;

      handleCancel();
      fetchPosts();
    } catch (err: any) {
      alert('Error saving post: ' + err.message);
    }

    setIsSaving(false);
  };

  return (
    <div>
      {/* Architectural Header */}
      <div className="border-auib-charcoal mb-10 flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-auib-charcoal text-3xl font-bold uppercase tracking-widest">
          Blog CMS
        </h2>
        <button
          onClick={showForm ? handleCancel : () => setShowForm(true)}
          className="bg-auib-red border-auib-charcoal hover:text-auib-red border-4 px-6 py-2 font-bold uppercase tracking-wider text-white shadow-[6px_6px_0px_0px_#273237] transition-colors hover:-translate-y-0.5 hover:bg-white hover:shadow-[8px_8px_0px_0px_#273237]"
        >
          {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Brutalist Data Table */}
      {!showForm && (
        <div className="text-auib-charcoal border-auib-charcoal mb-12 overflow-x-auto border-4 bg-white shadow-[8px_8px_0px_0px_#273237]">
          <table className="w-full border-collapse text-left">
            <thead className="border-auib-charcoal bg-auib-charcoal border-b-4 text-white">
              <tr>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Title (EN)</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Title (AR)</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Author</th>
                <th className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-auib-charcoal divide-y-2">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-auib-charcoal/70 px-6 py-8 text-center text-sm font-bold uppercase tracking-widest"
                  >
                    Loading posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-auib-charcoal/70 px-6 py-8 text-center text-sm font-bold uppercase tracking-widest"
                  >
                    No posts found.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-auib-charcoal/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold">{post.title_en}</td>
                    <td className="px-6 py-4 text-sm font-bold">{post.title_ar}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {post.users?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className="bg-auib-red border-auib-charcoal border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_#273237]">
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
        <div className="text-auib-charcoal border-auib-charcoal max-w-6xl border-4 bg-white p-8 shadow-[12px_12px_0px_0px_#273237] md:p-12">
          <h3 className="border-auib-charcoal mb-8 border-b-4 pb-4 text-2xl font-bold uppercase tracking-widest">
            Draft New Post
          </h3>

          <div className="mb-8">
            <label className="text-auib-charcoal mb-3 block text-sm font-bold uppercase tracking-wide">
              Slug (optional, auto-generated from Title EN if empty)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-mono text-sm transition-all focus:outline-none focus:ring-1 md:w-1/2"
            />
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label className="text-auib-charcoal mb-3 block text-sm font-bold uppercase tracking-wide">
                  Title (English)
                </label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-bold transition-all focus:outline-none focus:ring-1"
                />
              </div>
              <div>
                <label className="text-auib-charcoal mb-3 block text-sm font-bold uppercase tracking-wide">
                  Content (English)
                </label>
                <RichTextEditor content={contentEn} onChange={setContentEn} />
              </div>
            </div>
            <div className="space-y-6" dir="rtl">
              <div>
                <label className="text-auib-charcoal mb-3 block text-right text-sm font-bold uppercase tracking-wide">
                  العنوان (عربي)
                </label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-bold transition-all focus:outline-none focus:ring-1"
                />
              </div>
              <div>
                <label className="text-auib-charcoal mb-3 block text-right text-sm font-bold uppercase tracking-wide">
                  المحتوى (عربي)
                </label>
                <RichTextEditor content={contentAr} onChange={setContentAr} />
              </div>
            </div>
          </div>
          <div className="mt-12 flex justify-end">
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="bg-auib-charcoal border-auib-charcoal hover:bg-auib-red hover:border-auib-red border-4 px-8 py-4 font-bold uppercase tracking-wider text-white shadow-[6px_6px_0px_0px_#273237] transition-colors hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#273237] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Publish Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
