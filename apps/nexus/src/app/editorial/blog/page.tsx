'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { RichTextEditor } from '@auibsal/ui';
import { BlogPost } from "@auibsal/database";

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
    const { data, error } = await supabase.from('blog_posts').select('id, title_en, title_ar, users(full_name)').order('published_at', { ascending: false });
    if (!error && data) {
      setPosts(data as any);
    }
    setLoading(false);
  };

  // CRITICAL: Dedicated cancel handler to prevent state memory leaks
  const handleCancel = () => {
    setTitleEn(''); setTitleAr(''); setContentEn(''); setContentAr(''); setSlug('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!supabase) return;
    setIsSaving(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        // Autogenerate slug if empty
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

    } catch (err: any) {
        alert("Error saving post: " + err.message);
    }

    setIsSaving(false);
  };

  return (
    <div>
      {/* Architectural Header */}
      <div className="flex justify-between items-center mb-10 border-b-4 border-auib-charcoal pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Blog CMS</h2>
        <button
            onClick={showForm ? handleCancel : () => setShowForm(true)}
            className="bg-auib-red text-white font-bold uppercase tracking-wider px-6 py-2 border-4 border-auib-charcoal hover:bg-white hover:text-auib-red transition-colors shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-0.5">
            {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Brutalist Data Table */}
      {!showForm && (
        <div className="bg-white text-auib-charcoal border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] overflow-x-auto mb-12">
            <table className="w-full text-left border-collapse">
            <thead className="border-b-4 border-auib-charcoal bg-auib-charcoal text-white">
                <tr>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Title (EN)</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Title (AR)</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Author</th>
                <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide text-right">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y-2 divide-auib-charcoal">
                {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/70">Loading posts...</td></tr>
                ) : posts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/70">No posts found.</td></tr>
                ) : posts.map(post => (
                <tr key={post.id} className="hover:bg-auib-charcoal/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold">{post.title_en}</td>
                  <td className="px-6 py-4 text-sm font-bold">{post.title_ar}</td>
                  <td className="px-6 py-4 text-sm font-medium">{post.users?.full_name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className="bg-auib-red text-white py-1.5 px-3 font-bold uppercase text-xs tracking-wider border-2 border-auib-charcoal shadow-[2px_2px_0px_0px_#273237]">Published</span>
                  </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}

      {/* Draft Post Form */}
      {showForm && (
        <div className="bg-white text-auib-charcoal p-8 md:p-12 border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] max-w-6xl">
            <h3 className="text-2xl font-bold mb-8 uppercase tracking-widest border-b-4 border-auib-charcoal pb-4">Draft New Post</h3>

            <div className="mb-8">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-3">Slug (optional, auto-generated from Title EN if empty)</label>
                <input type="text" value={slug} onChange={e=>setSlug(e.target.value)} className="w-full md:w-1/2 p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-mono text-sm" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-3">Title (English)</label>
                <input type="text" required value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold" />
                </div>
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-3">Content (English)</label>
                <RichTextEditor content={contentEn} onChange={setContentEn} />
                </div>
            </div>
            <div className="space-y-6" dir="rtl">
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-3 text-right">العنوان (عربي)</label>
                <input type="text" required value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red transition-all rounded-none font-bold" />
                </div>
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-3 text-right">المحتوى (عربي)</label>
                <RichTextEditor content={contentAr} onChange={setContentAr} />
                </div>
            </div>
            </div>
            <div className="mt-12 flex justify-end">
                <button disabled={isSaving} onClick={handleSave} className="bg-auib-charcoal text-white font-bold uppercase tracking-wider px-8 py-4 border-4 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] disabled:opacity-50 hover:-translate-y-1">
                    {isSaving ? 'Saving...' : 'Publish Post'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
