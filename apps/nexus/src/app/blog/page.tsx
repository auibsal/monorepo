'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RichTextEditor } from 'ui';
import { BlogPost } from "database";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('blog_posts').select('*, users(full_name)').order('published_at', { ascending: false });
    if (!error && data) {
      setPosts(data as any);
    }
    setLoading(false);
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
            cover_image_url: '', // Default empty for now
        });

        if (error) throw error;

        setTitleEn(''); setTitleAr(''); setContentEn(''); setContentAr(''); setSlug('');
        setShowForm(false);
        fetchPosts();

    } catch (err: any) {
        alert("Error saving post: " + err.message);
    }

    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-auib-white">Blog CMS</h2>
        <button
            onClick={() => setShowForm(!showForm)}
            className="bg-auib-red text-auib-white font-bold uppercase tracking-wider px-4 py-2 border-2 border-auib-red hover:bg-auib-white hover:text-auib-red transition-colors shadow-[4px_4px_0px_0px_#273237]">
            {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {!showForm && (
        <div className="bg-auib-white text-auib-charcoal border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] overflow-hidden mb-12">
            <table className="w-full text-left">
            <thead className="border-b-2 border-auib-charcoal bg-auib-charcoal text-auib-white">
                <tr>
                <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Title (EN)</th>
                <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Title (AR)</th>
                <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Author</th>
                <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y-2 divide-auib-charcoal/20">
                {loading ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-sm font-mono text-center">Loading posts...</td></tr>
                ) : posts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-sm font-mono text-center">No posts found.</td></tr>
                ) : posts.map(post => (
                <tr key={post.id}>
                <td className="px-6 py-4 text-sm font-bold">{post.title_en}</td>
                <td className="px-6 py-4 text-sm font-bold font-mono">{post.title_ar}</td>
                <td className="px-6 py-4 text-sm">{post.users?.full_name || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm"><span className="bg-auib-red text-white py-1 px-2 font-bold uppercase text-xs tracking-wider border border-auib-red shadow-[2px_2px_0px_0px_#273237]">Published</span></td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}

      {/* Draft Post Form */}
      {showForm && (
        <div className="bg-auib-white text-auib-charcoal p-8 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] max-w-6xl">
            <h3 className="text-xl font-bold mb-6 uppercase tracking-widest border-b-2 border-auib-charcoal pb-2">Draft New Post</h3>

            <div className="mb-6">
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">Slug (optional, auto-generated from Title EN if empty)</label>
                <input type="text" value={slug} onChange={e=>setSlug(e.target.value)} className="w-full md:w-1/2 p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none font-mono" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">Title (English)</label>
                <input type="text" required value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
                </div>
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">Content (English)</label>
                <RichTextEditor content={contentEn} onChange={setContentEn} />
                </div>
            </div>
            <div className="space-y-4" dir="rtl">
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2 text-left" dir="ltr">العنوان (عربي)</label>
                <input type="text" required value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
                </div>
                <div>
                <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2 text-left" dir="ltr">المحتوى (عربي)</label>
                <RichTextEditor content={contentAr} onChange={setContentAr} />
                </div>
            </div>
            </div>
            <div className="mt-8 flex justify-end">
                <button disabled={isSaving} onClick={handleSave} className="bg-auib-charcoal text-auib-white font-bold uppercase tracking-wider px-6 py-3 border-2 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors shadow-[4px_4px_0px_0px_#9C213E] disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Publish Post'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
