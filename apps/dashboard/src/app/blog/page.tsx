'use client';

import { useState } from 'react';
import { RichTextEditor } from 'ui';

export default function BlogPage() {
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-widest">Blog CMS</h2>
        <button className="bg-auib-red text-auib-white font-bold uppercase tracking-wider px-4 py-2 border-2 border-auib-red hover:bg-auib-white hover:text-auib-red transition-colors shadow-[4px_4px_0px_0px_#273237]">New Post</button>
      </div>

      <div className="bg-auib-charcoal text-auib-white border-2 border-auib-white shadow-[8px_8px_0px_0px_#FFFFFF] overflow-hidden mb-12">
        <table className="w-full text-left">
          <thead className="border-b-2 border-auib-white">
            <tr>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Title (EN)</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Title (AR)</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Author</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Status</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-auib-white/20">
            <tr>
              <td className="px-6 py-4 text-sm font-medium">Welcome to SAL</td>
              <td className="px-6 py-4 text-sm font-medium">مرحباً بكم في الجمعية</td>
              <td className="px-6 py-4 text-sm">Admin User</td>
              <td className="px-6 py-4 text-sm"><span className="bg-auib-red text-white py-1 px-2 font-bold uppercase text-xs tracking-wider border border-auib-red">Published</span></td>
              <td className="px-6 py-4 text-sm text-auib-white hover:text-auib-red font-bold uppercase tracking-wider cursor-pointer transition-colors">Edit</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Draft Post Form */}
      <div className="bg-auib-white text-auib-charcoal p-8 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] max-w-6xl">
        <h3 className="text-xl font-bold mb-6 uppercase tracking-widest border-b-2 border-auib-charcoal pb-2">Draft New Post</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">Title (English)</label>
              <input type="text" className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">Content (English)</label>
              <RichTextEditor content={contentEn} onChange={setContentEn} />
            </div>
          </div>
          <div className="space-y-4" dir="rtl">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">العنوان (عربي)</label>
              <input type="text" className="w-full p-3 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red transition-colors rounded-none" />
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wide text-auib-charcoal mb-2">المحتوى (عربي)</label>
              <RichTextEditor content={contentAr} onChange={setContentAr} />
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
            <button className="bg-auib-charcoal text-auib-white font-bold uppercase tracking-wider px-6 py-3 border-2 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-colors shadow-[4px_4px_0px_0px_#9C213E]">Save Draft</button>
        </div>
      </div>
    </div>
  );
}
