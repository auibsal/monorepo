export default function JournalPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Journal Issues</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">New Issue</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-lg font-medium">Volume 1, Issue 1</h3>
                <p className="text-sm text-gray-500">Fall 2026</p>
            </div>
            <span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs">Published</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">12 Entries Assigned</p>
          <button className="text-blue-600 text-sm font-medium hover:underline">Manage Entries &rarr;</button>
        </div>
      </div>
    </div>
  );
}
