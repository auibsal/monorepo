'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { AlertOctagon, GripVertical } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Submission, SubmissionStatus } from '@auibsal/database';

const STATUSES: { id: SubmissionStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'revisions_requested', label: 'Revisions Requested' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function KanbanBoard() {
  const [submissions, setSubmissions] = useState<
    Record<string, Pick<Submission, 'id' | 'title' | 'type' | 'status' | 'rubric_formatting'>>
  >({});
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // CRITICAL: Hydration flag to ensure DragDropContext only mounts on the client
    setIsMounted(true);
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('submissions')
      .select('id, title, type, status, rubric_formatting');
    if (!error && data) {
      setSubmissions(Object.fromEntries(data.map((sub) => [sub.id, sub])));
    }
    setLoading(false);
  };

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
      void error;
      // Automatically revert the card if the database request fails
      fetchSubmissions();
    }
  };

  const groupedSubmissions = useMemo(() => {
    const grouped: Record<
      SubmissionStatus,
      Pick<Submission, 'id' | 'title' | 'type' | 'status' | 'rubric_formatting'>[]
    > = {
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
      <div className="flex h-64 items-center justify-center border-4 border-dashed border-border/20 p-8 font-bold tracking-widest text-foreground/50 uppercase">
        Loading Board Logistics...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex snap-x items-start gap-8 overflow-x-auto pb-8">
        {STATUSES.map((status) => (
          <div key={status.id} className="flex w-80 flex-shrink-0 snap-start flex-col">
            {/* Brutalist Column Header mapped to semantic inversion */}
            <h3 className="mb-4 flex items-center justify-between border-b-4 border-border pb-3 font-bold tracking-widest text-foreground uppercase">
              {status.label}
              <span className="bg-foreground px-3 py-1 text-xs font-bold text-background shadow-[4px_4px_0px_0px_var(--primary)]">
                {groupedSubmissions[status.id].length}
              </span>
            </h3>

            {/* Drop Zone */}
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
                  {groupedSubmissions[status.id].map((sub, index) => (
                    <Draggable key={sub.id} draggableId={sub.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`border-4 bg-card p-5 text-foreground transition-all ${
                            snapshot.isDragging
                              ? 'z-50 scale-105 -rotate-2 border-primary shadow-[12px_12px_0px_0px_var(--primary)]'
                              : 'border-border shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]'
                          }`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical
                              className="mt-0.5 flex-shrink-0 cursor-grab text-foreground/30 active:cursor-grabbing"
                              size={20}
                            />
                            <div className="min-w-0 flex-1">
                              {/* ⚡ Bolt Routing Optimization: Locked the href to the secure perimeter */}
                              <Link
                                href={`/editorial/submissions/${sub.id}`}
                                className="group block"
                              >
                                <h4 className="mb-3 truncate leading-tight font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary">
                                  {sub.title}
                                </h4>
                              </Link>
                              <div className="mt-5 flex items-end justify-between">
                                <span className="border-2 border-border bg-foreground px-3 py-1.5 text-xs font-bold tracking-widest text-background uppercase shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">
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
                  ))}
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
