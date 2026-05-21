'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createClient } from '@auibsal/auth/client';
import { Submission, SubmissionStatus } from '@auibsal/database';
import Link from 'next/link';
import { GripVertical, AlertOctagon } from 'lucide-react';

const STATUSES: { id: SubmissionStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'revisions_requested', label: 'Revisions Requested' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function KanbanBoard() {
  const [submissions, setSubmissions] = useState<Record<string, Pick<Submission, 'id' | 'title' | 'type' | 'status' | 'rubric_formatting'>>>({});
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
    const { data, error } = await supabase.from('submissions').select('id, title, type, status, rubric_formatting');
    if (!error && data) {
      setSubmissions(Object.fromEntries(data.map(sub => [sub.id, sub])));
    }
    setLoading(false);
  };

  const onDragEnd = async (result: DropResult) => {
    if (!supabase) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const draggedSubmission = submissions[draggableId];
    if (!draggedSubmission) return;

    const newStatus = destination.droppableId as SubmissionStatus;

    // Optimistic UI update
    setSubmissions(prev => ({
      ...prev,
      [draggableId]: { ...prev[draggableId], status: newStatus }
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
    const grouped: Record<SubmissionStatus, Pick<Submission, 'id' | 'title' | 'type' | 'status' | 'rubric_formatting'>[]> = {
      pending: [],
      under_review: [],
      revisions_requested: [],
      accepted: [],
      rejected: [],
    };
    Object.values(submissions).forEach(sub => {
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
      <div className="p-8 font-bold uppercase tracking-widest text-auib-charcoal/50 flex items-center justify-center h-64 border-4 border-dashed border-auib-charcoal/20">
        Loading Board Logistics...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-8 overflow-x-auto pb-8 items-start snap-x">
        {STATUSES.map(status => (
          <div key={status.id} className="w-80 flex-shrink-0 flex flex-col snap-start">
            
            {/* Brutalist Column Header */}
            <h3 className="font-bold text-auib-charcoal mb-4 uppercase tracking-widest flex items-center justify-between border-b-4 border-auib-charcoal pb-3">
              {status.label}
              <span className="bg-auib-charcoal text-white py-1 px-3 font-bold text-xs shadow-[4px_4px_0px_0px_#9C213E]">
                {groupedSubmissions[status.id].length}
              </span>
            </h3>

            {/* Drop Zone */}
            <Droppable droppableId={status.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[600px] border-4 flex flex-col gap-5 p-4 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-auib-charcoal/5 border-auib-red border-dashed' : 'bg-transparent border-auib-charcoal'
                  }`}
                >
                  {groupedSubmissions[status.id]
                    .map((sub, index) => (
                      <Draggable key={sub.id} draggableId={sub.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white text-auib-charcoal p-5 border-4 transition-all ${
                              snapshot.isDragging 
                                ? 'border-auib-red shadow-[12px_12px_0px_0px_#9C213E] -rotate-2 z-50 scale-105' 
                                : 'border-auib-charcoal shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-0.5'
                            }`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div className="flex items-start gap-3">
                              <GripVertical className="text-auib-charcoal/30 flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing" size={20} />
                              <div className="flex-1 min-w-0">
                                <Link href={`/submissions/${sub.id}`} className="block group">
                                  <h4 className="font-bold uppercase tracking-wide mb-3 text-auib-charcoal group-hover:text-auib-red transition-colors truncate leading-tight">
                                    {sub.title}
                                  </h4>
                                </Link>
                                <div className="flex justify-between items-end mt-5">
                                  <span className="text-xs font-bold uppercase tracking-widest bg-auib-charcoal text-white px-3 py-1.5 border-2 border-auib-charcoal shadow-[2px_2px_0px_0px_#273237]">
                                    {sub.type}
                                  </span>
                                  {sub.rubric_formatting === 'disqualified' && (
                                    <span className="text-xs font-bold text-auib-red uppercase tracking-widest flex items-center gap-1">
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
