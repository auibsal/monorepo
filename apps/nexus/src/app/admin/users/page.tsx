'use client';

import { useEffect, useState } from 'react';

import { Loader2, Save, Users } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Role, User } from '@auibsal/database';

export default function UsersPage() {
  const [users, setUsers] = useState<
    Pick<User, 'id' | 'full_name' | 'university_id' | 'role' | 'created_at'>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!supabase) return;
    // ⚡ Bolt Optimization: Replaced `.select('*')` with explicit column names
    // Impact: Reduces payload size by avoiding fetching unnecessary fields (like avatar_url, biography, calendar_token)
    // Measurement: Compare network tab payload size of /users endpoint before and after.
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, university_id, role, created_at')
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
    const { error } = await supabase
      .from('users')
      .update({
        role: newRole as import('@auibsal/database').Database['public']['Enums']['user_role'],
      })
      .eq('id', userId);
    setSavingId(null);
    if (error) {
      alert('Failed to update role: ' + error.message);
      fetchUsers(); // Revert optimistic update on error
    }
  };

  return (
    <div className="space-y-12">
      {/* Architectural Header anchored to foreground/border tokens */}
      <div className="flex items-center justify-between border-b-4 border-border pb-4">
        <h2 className="flex items-center gap-3 text-3xl font-bold tracking-widest text-foreground uppercase">
          <Users className="text-primary" size={32} />
          User Directory
        </h2>
      </div>

      {/* Brutalist Data Table fully inverted for dynamic theming */}
      <div className="overflow-x-auto border-4 border-border bg-card text-foreground shadow-[12px_12px_0px_0px_var(--brutalist-shadow)]">
        <table className="w-full border-collapse text-left">
          <thead className="border-b-4 border-border bg-foreground text-background">
            <tr>
              <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">Name</th>
              <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">University ID</th>
              <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">System Role</th>
              <th className="px-6 py-4 text-right text-sm font-bold tracking-wide uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="m-4 border-4 border-dashed border-border/20 px-6 py-12 text-center text-sm font-bold tracking-widest text-foreground/50 uppercase"
                >
                  Loading Database...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="m-4 border-4 border-dashed border-border/20 px-6 py-12 text-center text-sm font-bold tracking-widest text-foreground/50 uppercase"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="group transition-colors hover:bg-foreground/5">
                  <td className="px-6 py-4 text-sm font-bold">{user.full_name}</td>
                  <td className="px-6 py-4 text-sm font-bold">
                    {user.university_id === 'EXTERNAL' ? (
                      <span className="border-2 border-primary bg-primary px-2 py-1 text-xs tracking-widest text-background uppercase shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">
                        External Affiliate
                      </span>
                    ) : (
                      <span className="font-mono text-foreground/80">{user.university_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={user.role || 'member'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="cursor-pointer rounded-none border-2 border-border bg-background p-2 text-sm font-bold tracking-wider text-foreground uppercase transition-colors hover:bg-foreground/5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold tracking-wider uppercase">
                    <button
                      onClick={() => saveRole(user.id, user.role || 'member')}
                      disabled={savingId === user.id}
                      className="inline-flex items-center gap-2 border-2 border-border bg-foreground px-4 py-2 text-xs font-bold tracking-widest text-background uppercase shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] disabled:opacity-50"
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
