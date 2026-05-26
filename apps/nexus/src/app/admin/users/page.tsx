'use client';

import { useEffect, useState } from 'react';

import { Save, Users } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Role, User } from '@auibsal/database';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // CRITICAL FIX: Isolate un-saved changes to prevent "Ghost States"
  const [draftRoles, setDraftRoles] = useState<Record<string, Role>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    // CRITICAL FIX: Encapsulate the async fetcher to satisfy strict React lifecycle rules
    const fetchUsers = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && isMounted) {
        setUsers(data);
      }
      if (isMounted) setLoading(false);
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleRoleChange = (userId: string, newRole: Role) => {
    // Update the draft map, not the source of truth
    setDraftRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const saveRole = async (userId: string, currentRole: Role) => {
    if (!supabase) return;

    const newRole = draftRoles[userId] || currentRole;
    if (newRole === currentRole) return; // Prevent redundant DB calls

    setSavingId(userId);

    const { error } = await supabase
      .from('users')
      .update({
        role: newRole as import('@auibsal/database').Database['public']['Enums']['user_role'],
      })
      .eq('id', userId);

    if (error) {
      alert('Failed to update role: ' + error.message);
    } else {
      // Upon confirmed success, sync the source of truth and clear the draft
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setDraftRoles((prev) => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    }

    setSavingId(null);
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
                  <div className="flex items-center justify-center gap-3">
                    {/* Reverted to semantic brutalist loader */}
                    <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
                    Loading Database...
                  </div>
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
              users.map((user) => {
                const currentDraft = draftRoles[user.id];
                const activeRole = currentDraft || user.role || 'member';
                const hasChanged = currentDraft && currentDraft !== user.role;

                return (
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
                        aria-label={`Select role for ${user.full_name}`}
                        value={activeRole}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className={`cursor-pointer rounded-none border-2 p-2 text-sm font-bold tracking-wider uppercase transition-colors focus:outline-none ${
                          hasChanged
                            ? 'border-primary bg-primary/10 text-primary focus:ring-1 focus:ring-primary'
                            : 'border-border bg-background text-foreground hover:bg-foreground/5 focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      >
                        <option value="member">Member</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold tracking-wider uppercase">
                      <button
                        aria-label={`Save role for ${user.full_name}`}
                        onClick={() => saveRole(user.id, user.role || 'member')}
                        // Disable if saving OR if no change has been made
                        disabled={savingId === user.id || !hasChanged}
                        className={`inline-flex items-center gap-2 border-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all ${
                          hasChanged
                            ? 'border-border bg-foreground text-background shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:shadow-[6px_6px_0px_0px_var(--brutalist-shadow)]'
                            : 'cursor-not-allowed border-border/50 bg-background text-foreground/30'
                        }`}
                      >
                        {savingId === user.id ? (
                          <div className="h-3 w-3 animate-spin rounded-none bg-background"></div>
                        ) : (
                          <Save size={14} />
                        )}
                        {savingId === user.id ? 'Saving...' : 'Save Role'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
