export default function SubmissionsPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Submissions Review</h2>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {/* Kanban Columns */}
        <div className="w-80 flex-shrink-0">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center justify-between">
            Pending <span className="bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">5</span>
          </h3>
          <div className="bg-gray-100 p-3 rounded-lg min-h-[500px] flex flex-col gap-3">
            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-1">The Autumn Leaves</h4>
              <p className="text-sm text-gray-500 mb-3">Poetry • Submitted 2 days ago</p>
              <div className="text-xs text-gray-400">By John Doe</div>
            </div>
          </div>
        </div>
        <div className="w-80 flex-shrink-0">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center justify-between">
            Under Review <span className="bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">2</span>
          </h3>
          <div className="bg-gray-100 p-3 rounded-lg min-h-[500px] flex flex-col gap-3">
            {/* Cards */}
          </div>
        </div>
        <div className="w-80 flex-shrink-0">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center justify-between">
            Accepted <span className="bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">14</span>
          </h3>
          <div className="bg-gray-100 p-3 rounded-lg min-h-[500px] flex flex-col gap-3">
            {/* Cards */}
          </div>
        </div>
        <div className="w-80 flex-shrink-0">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center justify-between">
            Rejected <span className="bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">3</span>
          </h3>
          <div className="bg-gray-100 p-3 rounded-lg min-h-[500px] flex flex-col gap-3">
            {/* Cards */}
          </div>
        </div>
      </div>
    </div>
  );
}
