'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { DragDropContext, Draggable, DropResult, Droppable } from '@hello-pangea/dnd';
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
    setSubmissions((prev) => ({
      ...prev,
      [draggableId]: { ...prev[draggableId], status: newStatus },
    }));

    // Database sync
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', draggableId);

    if (error) {
      console.error('Error updating status:', error);
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
      if (grouped[sub.status]) {
        grouped[sub.status].push(sub);
      }
    });
    return grouped;
  }, [submissions]);

  // Prevent Next.js SSR hydration mismatch crashes
  if (!isMounted) return null;

  if (loading) {
    return (
      <div className="text-auib-charcoal/50 border-auib-charcoal/20 flex h-64 items-center justify-center border-4 border-dashed p-8 font-bold uppercase tracking-widest">
        Loading Board Logistics...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex snap-x items-start gap-8 overflow-x-auto pb-8">
        {STATUSES.map((status) => (
          <div key={status.id} className="flex w-80 flex-shrink-0 snap-start flex-col">
            {/* Brutalist Column Header */}
            <h3 className="text-auib-charcoal border-auib-charcoal mb-4 flex items-center justify-between border-b-4 pb-3 font-bold uppercase tracking-widest">
              {status.label}
              <span className="bg-auib-charcoal px-3 py-1 text-xs font-bold text-white shadow-[4px_4px_0px_0px_#9C213E]">
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
                      ? 'bg-auib-charcoal/5 border-auib-red border-dashed'
                      : 'border-auib-charcoal bg-transparent'
                  }`}
                >
                  {groupedSubmissions[status.id].map((sub, index) => (
                    <Draggable key={sub.id} draggableId={sub.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`text-auib-charcoal border-4 bg-white p-5 transition-all ${
                            snapshot.isDragging
                              ? 'border-auib-red z-50 -rotate-2 scale-105 shadow-[12px_12px_0px_0px_#9C213E]'
                              : 'border-auib-charcoal shadow-[6px_6px_0px_0px_#273237] hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_#273237]'
                          }`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical
                              className="text-auib-charcoal/30 mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing"
                              size={20}
                            />
                            <div className="min-w-0 flex-1">
                              <Link href={`/submissions/${sub.id}`} className="group block">
                                <h4 className="text-auib-charcoal group-hover:text-auib-red mb-3 truncate font-bold uppercase leading-tight tracking-wide transition-colors">
                                  {sub.title}
                                </h4>
                              </Link>
                              <div className="mt-5 flex items-end justify-between">
                                <span className="bg-auib-charcoal border-auib-charcoal border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-[2px_2px_0px_0px_#273237]">
                                  {sub.type}
                                </span>
                                {sub.rubric_formatting === 'disqualified' && (
                                  <span className="text-auib-red flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                                    <AlertOctagon size={14} />
                                    DQ&apos;d
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
