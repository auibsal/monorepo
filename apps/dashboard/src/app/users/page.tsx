export default function UsersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">User Directory</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">University ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 text-sm font-medium">Jane Doe</td>
              <td className="px-6 py-4 text-sm text-gray-500">20230001</td>
              <td className="px-6 py-4 text-sm">
                <select className="border border-gray-300 rounded p-1 text-sm bg-white" defaultValue="member">
                    <option value="user">User</option>
                    <option value="member">Member</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                </select>
              </td>
              <td className="px-6 py-4 text-sm text-blue-600 hover:underline cursor-pointer">Save Role</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
