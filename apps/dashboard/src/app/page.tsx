export default function DashboardHome() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Pending Submissions</h3>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Active Members</h3>
          <p className="text-3xl font-bold">48</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Upcoming Events</h3>
          <p className="text-3xl font-bold">3</p>
        </div>
      </div>
    </div>
  );
}
