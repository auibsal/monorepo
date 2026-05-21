'use client';

import { useEffect, useState } from 'react';

import { Loader2, Save, Users } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Role, User } from '@auibsal/database';

export default function UsersPage() {
  const [users, setUsers] = useState<Pick<User, 'id' | 'full_name' | 'university_id' | 'role'>[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!supabase) return;
    // ⚡ Bolt Performance Optimization: Explicitly select only the required fields to prevent over-fetching large 'biography' and 'avatar_url' fields in this list view.
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, university_id, role')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const saveRole = async (userId: string, newRole: Role) => {
    if (!supabase) return;
    setSavingId(userId);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    setSavingId(null);
    if (error) {
      alert('Failed to update role: ' + error.message);
      fetchUsers(); // Revert optimistic update on error
    }
  };

  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="border-auib-charcoal flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-auib-charcoal flex items-center gap-3 text-3xl font-bold uppercase tracking-widest">
          <Users className="text-auib-red" size={32} />
          User Directory
        </h2>
      </div>

      {/* Brutalist Data Table */}
      <div className="text-auib-charcoal border-auib-charcoal overflow-x-auto border-4 bg-white shadow-[12px_12px_0px_0px_#273237]">
        <table className="w-full border-collapse text-left">
          <thead className="border-auib-charcoal bg-auib-charcoal border-b-4 text-white">
            <tr>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Name</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">University ID</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">System Role</th>
              <th className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-auib-charcoal divide-y-2">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-auib-charcoal/50 border-auib-charcoal/20 m-4 border-4 border-dashed px-6 py-12 text-center text-sm font-bold uppercase tracking-widest"
                >
                  Loading Database...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-auib-charcoal/50 border-auib-charcoal/20 m-4 border-4 border-dashed px-6 py-12 text-center text-sm font-bold uppercase tracking-widest"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-auib-charcoal/5 group transition-colors">
                  <td className="px-6 py-4 text-sm font-bold">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm font-bold">
                    {user.university_id === 'EXTERNAL' ? (
                      <span className="bg-auib-red border-auib-red border-2 px-2 py-1 text-xs uppercase tracking-widest text-white shadow-[2px_2px_0px_0px_#273237]">
                        External Affiliate
                      </span>
                    ) : (
                      <span className="text-auib-charcoal/80 font-mono">{user.university_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red hover:bg-auib-charcoal/5 cursor-pointer rounded-none border-2 bg-white p-2 text-sm font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-1"
                    >
                      <option value="member">Member</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wider">
                    <button
                      onClick={() => saveRole(user.id, user.role)}
                      disabled={savingId === user.id}
                      className="bg-auib-charcoal border-auib-charcoal hover:bg-auib-red hover:border-auib-red inline-flex items-center gap-2 border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_#273237] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#273237] disabled:opacity-50"
                    >
                      {savingId === user.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      {savingId === user.id ? 'Saving...' : 'Save Role'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
