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
      fetchUsers(); // Revert optimistic update on error
    }
  };

  return (
    <div className="space-y-12">
      
      {/* Architectural Header anchored to foreground/border tokens */}
      <div className="flex justify-between items-center border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-3">
          <Users className="text-primary" size={32} />
          User Directory
        </h2>
      </div>

      {/* Brutalist Data Table fully inverted for dynamic theming */}
      <div className="bg-card text-foreground border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b-4 border-border bg-foreground text-background">
            <tr>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Name</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">University ID</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">System Role</th>
              <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-sm font-bold uppercase tracking-widest text-center text-foreground/50 border-4 border-dashed border-border/20 m-4">
                  Loading Database...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-sm font-bold uppercase tracking-widest text-center text-foreground/50 border-4 border-dashed border-border/20 m-4">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-foreground/5 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm font-bold">
                    {user.university_id === 'EXTERNAL' ? (
                      <span className="bg-primary text-background px-2 py-1 text-xs uppercase tracking-widest border-2 border-primary shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">
                        External Affiliate
                      </span>
                    ) : (
                      <span className="font-mono text-foreground/80">{user.university_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="border-2 border-border rounded-none p-2 text-sm bg-background font-bold text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:bg-foreground/5 transition-colors uppercase tracking-wider"
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
                      className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 border-border hover:bg-primary hover:border-primary transition-all disabled:opacity-50 shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-0.5"
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
