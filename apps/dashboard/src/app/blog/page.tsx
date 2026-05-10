export default function BlogPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Blog CMS</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">New Post</button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Title (EN)</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Title (AR)</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Author</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 text-sm">Welcome to SAL</td>
              <td className="px-6 py-4 text-sm">مرحباً بكم في الجمعية</td>
              <td className="px-6 py-4 text-sm">Admin User</td>
              <td className="px-6 py-4 text-sm"><span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs">Published</span></td>
              <td className="px-6 py-4 text-sm text-blue-600 hover:underline cursor-pointer">Edit</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Example Form (hidden by default in real app, showing for scaffolding) */}
      <div className="mt-12 bg-white p-6 rounded-lg border border-gray-200 max-w-4xl">
        <h3 className="text-lg font-medium mb-4">Draft New Post</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content (English)</label>
              <textarea rows={10} className="w-full border border-gray-300 rounded-md p-2"></textarea>
            </div>
          </div>
          <div className="space-y-4" dir="rtl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان (عربي)</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى (عربي)</label>
              <textarea rows={10} className="w-full border border-gray-300 rounded-md p-2"></textarea>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
            <button className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900">Save Draft</button>
        </div>
      </div>
    </div>
  );
}
