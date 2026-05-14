'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User, Role } from 'database';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const saveRole = async (userId: string, newRole: Role) => {
    if (!supabase) return;
    setSavingId(userId);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    setSavingId(null);
    if (error) {
      alert('Failed to update role: ' + error.message);
      fetchUsers(); // Revert on error
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-auib-white">User Directory</h2>
      </div>

      <div className="bg-auib-white text-auib-charcoal border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b-2 border-auib-charcoal bg-auib-charcoal text-auib-white">
            <tr>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">University ID</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Role</th>
              <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-auib-charcoal/20">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-mono text-center">Loading users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-mono text-center">No users found.</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 text-sm font-bold">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-auib-charcoal/70">{user.university_id}</td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="border-2 border-auib-charcoal rounded-none p-2 text-sm bg-transparent focus:outline-none focus:border-auib-red font-mono"
                    >
                        <option value="user">User</option>
                        <option value="member">Member</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold uppercase tracking-wider">
                    <button
                      onClick={() => saveRole(user.id, user.role)}
                      disabled={savingId === user.id}
                      className="text-auib-red hover:text-auib-charcoal transition-colors disabled:opacity-50"
                    >
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
