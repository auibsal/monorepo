'use client';

import { createClient } from '@auibsal/auth/client';
import type { Tables } from '@auibsal/database/types';
import { AlertTriangle, RefreshCw, ShieldCheck, Terminal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Extend the native table type to account for the relational join
type SystemLogWithActor = Tables<'system_logs'> & {
  users?: { full_name: string } | null;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLogWithActor[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  // CRITICAL FIX: Wrapped in useCallback to satisfy React 19 concurrency rules without eslint hacks
  const fetchLogs = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    setErrorMessage('');

    try {
      // CRITICAL FIX: Executed a relational join to pull the human-readable full_name from the users table
      const { data, error } = await supabase
        .from('system_logs')
        .select('*, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs((data as SystemLogWithActor[]) || []);
      setStatus('idle');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'FATAL: Unable to mount log volume.');
    }
  }, [supabase]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Helper to color-code terminal output based on severity
  const getLevelColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'DELETE':
        return 'text-primary animate-pulse';
      case 'UPDATE':
        return 'text-yellow-500';
      case 'INSERT':
        return 'text-green-500';
      default:
        return 'text-foreground/70';
    }
  };

  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-border pb-4">
        <h2 className="flex items-center gap-3 text-3xl font-bold tracking-widest text-foreground uppercase">
          <Terminal className="text-primary" size={32} />
          System Logs
        </h2>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={status === 'loading'}
          className="flex items-center gap-2 border-2 border-border bg-card px-4 py-2 text-sm font-bold tracking-widest text-foreground uppercase shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] transition-all hover:-translate-y-0.5 hover:border-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
          {status === 'loading' ? 'Polling...' : 'Flush & Refresh'}
        </button>
      </div>

      {/* Brutalist Terminal Interface */}
      <div className="relative flex min-h-[400px] flex-col overflow-x-auto border-4 border-border bg-card p-6 font-mono text-sm shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] md:p-8">
        {/* Terminal Header Bar */}
        <div className="mb-4 flex items-center gap-3 border-b-2 border-border/20 pb-4 text-xs font-bold tracking-widest text-foreground/50 uppercase">
          <ShieldCheck size={16} />
          <span>NEXUS_OS {/* AUDIT_DAEMON // TAIL -N 50 */}</span>
        </div>

        {/* Dynamic State Rendering */}
        <div className="flex-1">
          {status === 'loading' && logs.length === 0 ? (
            <div className="flex animate-pulse items-center gap-3 text-foreground/50">
              <div className="h-4 w-2 animate-ping bg-primary"></div>
              <p>Establishing secure connection to audit volume...</p>
            </div>
          ) : status === 'error' ? (
            <div className="space-y-2 font-bold text-red-500">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <span>[SYS_ERR] Core dump executed. Directory mapping failed.</span>
              </div>
              <p className="pl-6 opacity-80">Exception: {errorMessage}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-foreground/50">
              <p>{'>'} Audit ledger initialized.</p>
              <p>{'>'} 0 events recorded in current matrix.</p>
              <div className="mt-2 h-4 w-2 animate-pulse bg-primary"></div>
            </div>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => {
                // Safely resolve identity, falling back to UUID if user was deleted, or SYSTEM if triggered via backend
                const actorIdentity = log.users?.full_name || log.actor_id || 'SYSTEM';

                return (
                  <li
                    key={log.id}
                    className="-mx-1 flex flex-col gap-2 p-1 transition-colors hover:bg-foreground/5 md:flex-row md:items-start md:gap-4"
                  >
                    <span className="shrink-0 text-foreground/40">
                      [
                      {log.created_at
                        ? new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)
                        : 'UNKNOWN'}
                      ]
                    </span>
                    <span
                      className={`shrink-0 font-bold tracking-wider uppercase ${getLevelColor(log.action)}`}
                    >
                      [{log.action}]
                    </span>
                    <span className="break-words text-foreground">
                      <span className="font-bold text-primary">{actorIdentity}</span> executed{' '}
                      <span className="underline decoration-border/50 underline-offset-2">
                        {log.action}
                      </span>{' '}
                      on {log.entity_type} ({log.entity_id})
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center gap-2 pt-4 text-foreground/50">
                <span>{'>'} EOF</span>
                <div className="h-4 w-2 animate-pulse bg-primary"></div>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
