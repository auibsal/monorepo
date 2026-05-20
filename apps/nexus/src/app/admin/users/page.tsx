'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { User, Role } from '@auibsal/database';
import { Save, Loader2, Users } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!supabase) return;
    // ⚡ Bolt Performance Optimization: Explicitly select only required fields to prevent over-fetching
    const { data, error } = await supabase.from('users').select('id, full_name, university_id, role, created_at').order('created_at', { ascending: false });
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
      fetchUsers(); // Revert optimistic update on error
    }
  };

  return (
    <div className="space-y-12">
      
      {/* Architectural Header */}
      <div className="flex justify-between items-center border-b-4 border-auib-charcoal pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal flex items-center gap-3">
          <Users className="text-auib-red" size={32} />
          User Directory
        </h2>
      </div>

      {/* Brutalist Data Table */}
      <div className="bg-white text-auib-charcoal border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b-4 border-auib-charcoal bg-auib-charcoal text-white">
            <tr>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Name</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">University ID</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">System Role</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-auib-charcoal">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/50 border-4 border-dashed border-auib-charcoal/20 m-4">
                  Loading Database...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/50 border-4 border-dashed border-auib-charcoal/20 m-4">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-auib-charcoal/5 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm font-bold">
                    {user.university_id === 'EXTERNAL' ? (
                      <span className="bg-auib-red text-white px-2 py-1 text-xs uppercase tracking-widest border-2 border-auib-red shadow-[2px_2px_0px_0px_#273237]">
                        External Affiliate
                      </span>
                    ) : (
                      <span className="font-mono text-auib-charcoal/80">{user.university_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="border-2 border-auib-charcoal rounded-none p-2 text-sm bg-white font-bold cursor-pointer focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red hover:bg-auib-charcoal/5 transition-colors uppercase tracking-wider"
                    >

                        <option value="member">Member</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-right">
                    <button
                      onClick={() => saveRole(user.id, user.role)}
                      disabled={savingId === user.id}
                      className="inline-flex items-center gap-2 bg-auib-charcoal text-white px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 border-auib-charcoal hover:bg-auib-red hover:border-auib-red transition-all disabled:opacity-50 shadow-[4px_4px_0px_0px_#273237] hover:shadow-[6px_6px_0px_0px_#273237] hover:-translate-y-0.5"
                    >
                      {savingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
