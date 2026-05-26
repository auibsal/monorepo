'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { DragDropContext, Draggable, DropResult, Droppable } from '@hello-pangea/dnd';
import { AlertOctagon, GripVertical, ShieldCheck, User } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Submission, SubmissionStatus } from '@auibsal/database';

const STATUSES: { id: SubmissionStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'revisions_requested', label: 'Revisions Requested' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

// Strictly define the shape of the relational join and the new assignment module
type BoardSubmission = Pick<
  Submission,
  'id' | 'title' | 'type' | 'status' | 'rubric_formatting'
> & {
  users: { full_name: string } | null;
  assigned_to?: string | null; // Assumes this column exists in your database
};

type EditorProfile = {
  id: string;
  full_name: string;
};

export default function KanbanBoard() {
  const [submissions, setSubmissions] = useState<Record<string, BoardSubmission>>({});
  const [editors, setEditors] = useState<EditorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const supabase = createClient();

  const fetchBoardData = useCallback(async () => {
    if (!supabase) return;

    try {
      // 1. Fetch Submissions with Author Identity and Assignee
      const { data: subData, error: subError } = await supabase
        .from('submissions')
        .select('id, title, type, status, rubric_formatting, assigned_to, users(full_name)');

      if (subError) throw subError;

      if (subData) {
        setSubmissions(
          Object.fromEntries(
            subData.map((sub) => [sub.id, sub as unknown as BoardSubmission])
          )
        );
      }

      // 2. Fetch Authorized Editors for the Assignment Module
      const { data: editorData, error: editorError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('role', ['editor', 'admin']);

      if (editorError) throw editorError;
      if (editorData) setEditors(editorData);

    } catch (err) {
      console.error('Failed to mount board data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMountedFlag = true;
    setIsMounted(true);

    if (isMountedFlag) {
      fetchBoardData();
    }

    return () => {
      isMountedFlag = false;
    };
  }, [fetchBoardData]);

  const onDragEnd = async (result: DropResult) => {
    if (!supabase) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    const draggedSubmission = submissions[draggableId];
    if (!draggedSubmission) return;

    const newStatus = destination.droppableId as SubmissionStatus;

    // Optimistic UI update
    setSubmissions((prev) => {
      const existing = prev[draggableId];
      if (!existing) return prev;
      return {
        ...prev,
        [draggableId]: { ...existing, status: newStatus },
      };
    });

    // Database sync
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', draggableId);

    if (error) {
      console.error('Error updating status:', error);
      fetchBoardData(); // Revert card on failure
    }
  };

  const handleAssignEditor = async (submissionId: string, editorId: string) => {
    if (!supabase) return;
    const newAssignee = editorId === 'unassigned' ? null : editorId;

    // Optimistic UI update
    setSubmissions((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], assigned_to: newAssignee },
    }));

    // Database sync
    const { error } = await supabase
      .from('submissions')
      .update({ assigned_to: newAssignee })
      .eq('id', submissionId);

    if (error) {
      alert('Failed to assign editor.');
      fetchBoardData(); // Revert on failure
    }
  };

  const groupedSubmissions = useMemo(() => {
    const grouped: Record<SubmissionStatus, BoardSubmission[]> = {
      pending: [],
      under_review: [],
      revisions_requested: [],
      accepted: [],
      rejected: [],
    };
    Object.values(submissions).forEach((sub) => {
      if (sub.status && grouped[sub.status]) {
        grouped[sub.status].push(sub);
      }
    });
    return grouped;
  }, [submissions]);

  // Prevent Next.js SSR hydration mismatch crashes
  if (!isMounted) return null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border-4 border-dashed border-border/20 p-8">
        <div className="flex animate-pulse items-center gap-3 text-sm font-bold tracking-widest text-foreground/50 uppercase">
          <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
          Loading Board Logistics...
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* CRITICAL FIX: Removed snap-x to allow smooth horizontal auto-scrolling during drag */}
      <div className="flex items-start gap-8 overflow-x-auto pb-8">
        {STATUSES.map((status) => (
          // CRITICAL FIX: Removed snap-start
          <div key={status.id} className="flex w-80 flex-shrink-0 flex-col">
            <h3 className="mb-4 flex items-center justify-between border-b-4 border-border pb-3 font-bold tracking-widest text-foreground uppercase">
              {status.label}
              <span className="bg-foreground px-3 py-1 text-xs font-bold text-background shadow-[4px_4px_0px_0px_var(--primary)]">
                {groupedSubmissions[status.id].length}
              </span>
            </h3>

            <Droppable droppableId={status.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex min-h-[600px] flex-col gap-5 border-4 p-4 transition-colors ${
                    snapshot.isDraggingOver
                      ? 'border-dashed border-primary bg-foreground/5'
                      : 'border-border bg-transparent'
                  }`}
                >
                  {groupedSubmissions[status.id].map((sub, index) => {
                    // BLIND REVIEW LOGIC: Mathematically evaluate terminal states
                    const isTerminalState =
                      sub.status === 'accepted' || sub.status === 'rejected';
                    const authorDisplay = isTerminalState
                      ? sub.users?.full_name || 'Unknown Author'
                      : 'Anonymous Manuscript';

                    return (
                      <Draggable key={sub.id} draggableId={sub.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            // CRITICAL FIX: Drag properties are removed from the root div to prevent clicking interference
                            className={`border-4 bg-card p-4 text-foreground transition-all ${
                              snapshot.isDragging
                                ? 'z-50 scale-105 -rotate-2 border-primary shadow-[12px_12px_0px_0px_var(--primary)]'
                                : 'border-border shadow-[6px_6px_0px_0px_var(--brutalist-shadow)]'
                            }`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div className="flex items-start gap-3">
                              {/* CRITICAL FIX: The Grip is now the strict, exclusive drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="mt-1 flex-shrink-0 cursor-grab p-1 text-foreground/30 active:cursor-grabbing hover:text-primary"
                              >
                                <GripVertical size={20} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/editorial/submissions/${sub.id}`}
                                  className="group block"
                                >
                                  <h4 className="mb-2 truncate leading-tight font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary">
                                    {sub.title}
                                  </h4>
                                </Link>

                                {/* Blind Review Identity Matrix */}
                                <div
                                  className={`mb-4 flex items-center gap-2 text-xs font-bold tracking-wider uppercase ${
                                    isTerminalState ? 'text-primary' : 'text-foreground/50'
                                  }`}
                                >
                                  <User size={12} />
                                  <span className="truncate">{authorDisplay}</span>
                                </div>

                                {/* Editor Assignment Task Module */}
                                <div className="mb-5 border-t-2 border-border/10 pt-4">
                                  <label className="mb-2 flex items-center gap-1 text-[10px] font-bold tracking-widest text-foreground/60 uppercase">
                                    <ShieldCheck size={12} />
                                    Assigned Editor
                                  </label>
                                  <select
                                    value={sub.assigned_to || 'unassigned'}
                                    onChange={(e) => handleAssignEditor(sub.id, e.target.value)}
                                    className="w-full cursor-pointer rounded-none border-2 border-border bg-background p-1.5 text-xs font-bold tracking-wider text-foreground uppercase transition-colors hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                                  >
                                    <option value="unassigned">-- Unassigned --</option>
                                    {editors.map((editor) => (
                                      <option key={editor.id} value={editor.id}>
                                        {editor.full_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-end justify-between">
                                  <span className="border-2 border-border bg-foreground px-3 py-1 text-[10px] font-bold tracking-widest text-background uppercase shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">
                                    {sub.type}
                                  </span>
                                  {sub.rubric_formatting === 'disqualified' && (
                                    <span className="flex items-center gap-1 text-xs font-bold tracking-widest text-primary uppercase">
                                      <AlertOctagon size={14} />
                                      DQ'd
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
