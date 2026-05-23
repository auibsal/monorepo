'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { Terminal, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

import { Tables } from '@auibsal/database';

// Establish the strict cryptographic shape of the audit ledger natively
type SystemLog = Tables<'system_logs'>;

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const fetchLogs = async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      // ⚡ Bolt Architecture: Polling the secure audit_logs table.
      // If this table is not yet provisioned in your database schema, 
      // the catch block will seamlessly render a terminal-authentic failure state.
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Type cast the validated payload to eliminate the 'any' bypass natively mapped to the database definition
      setLogs(data || []);
      setStatus('idle');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'FATAL: Unable to mount log volume.');
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to color-code terminal output based on severity (using action for system logs)
  const getLevelColor = (action: string) => {
    switch (action) {
      case 'DELETE': return 'text-primary animate-pulse';
      case 'UPDATE': return 'text-yellow-500';
      default: return 'text-foreground/70';
    }
  };

  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="flex justify-between items-end border-b-4 border-border pb-4 gap-4 flex-wrap">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-3">
          <Terminal className="text-primary" size={32} />
          System Logs
        </h2>
        <button
          onClick={fetchLogs}
          disabled={status === 'loading'}
          className="bg-card text-foreground px-4 py-2 text-sm font-bold uppercase tracking-widest border-2 border-border hover:bg-foreground hover:text-background hover:border-foreground transition-all disabled:opacity-50 shadow-[4px_4px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-0.5 flex items-center gap-2"
        >
          <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
          {status === 'loading' ? 'Polling...' : 'Flush & Refresh'}
        </button>
      </div>

      {/* Brutalist Terminal Interface */}
      <div className="bg-card p-6 md:p-8 border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] font-mono text-sm overflow-x-auto relative min-h-[400px] flex flex-col">
        
        {/* Terminal Header Bar */}
        <div className="flex items-center gap-3 border-b-2 border-border/20 pb-4 mb-4 text-foreground/50 uppercase tracking-widest text-xs font-bold">
          <ShieldCheck size={16} />
          <span>NEXUS_OS // AUDIT_DAEMON // TAIL -N 50</span>
        </div>

        {/* Dynamic State Rendering */}
        <div className="flex-1">
          {status === 'loading' && logs.length === 0 ? (
             <div className="flex items-center gap-3 text-foreground/50 animate-pulse">
               <div className="w-2 h-4 bg-primary animate-ping"></div>
               <p>Establishing secure connection to audit volume...</p>
             </div>
          ) : status === 'error' ? (
             <div className="text-red-500 font-bold space-y-2">
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
               <div className="w-2 h-4 bg-primary animate-pulse mt-2"></div>
             </div>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 hover:bg-foreground/5 p-1 -mx-1 transition-colors">
                  <span className="text-foreground/40 shrink-0">
                    [{log.created_at ? new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19) : 'UNKNOWN'}]
                  </span>
                  <span className={`shrink-0 uppercase tracking-wider font-bold ${getLevelColor(log.action)}`}>
                    [{log.action}]
                  </span>
                  <span className="text-foreground break-words">
                    <span className="font-bold text-primary">{log.actor_id || 'SYSTEM'}</span> executed <span className="underline decoration-border/50 underline-offset-2">{log.action}</span> on {log.entity_type} ({log.entity_id})
                  </span>
                </li>
              ))}
              <li className="pt-4 flex items-center gap-2 text-foreground/50">
                <span>{'>'} EOF</span>
                <div className="w-2 h-4 bg-primary animate-pulse"></div>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
