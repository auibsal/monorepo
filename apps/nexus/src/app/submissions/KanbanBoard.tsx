'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createBrowserClient } from '@supabase/ssr';
import { Submission, SubmissionStatus } from 'database';
import Link from 'next/link';

const STATUSES: { id: SubmissionStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'revisions_requested', label: 'Revisions Requested' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function KanbanBoard() {
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('submissions').select('*');
    if (!error && data) {
      setSubmissions(Object.fromEntries(data.map(sub => [sub.id, sub])));
    }
    setLoading(false);
  };

  const onDragEnd = async (result: DropResult) => {
    if (!supabase) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const draggedSubmission = submissions[draggableId];
    if (!draggedSubmission) return;

    const newStatus = destination.droppableId as SubmissionStatus;

    // Optimistic update
    setSubmissions(prev => ({
      ...prev,
      [draggableId]: { ...prev[draggableId], status: newStatus }
    }));

    // DB update
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', draggableId);

    if (error) {
      console.error('Error updating status:', error);
      // Revert on error
      fetchSubmissions();
    }
  };

  const groupedSubmissions = useMemo(() => {
    const grouped: Record<SubmissionStatus, Submission[]> = {
      pending: [],
      under_review: [],
      revisions_requested: [],
      accepted: [],
      rejected: [],
    };
    Object.values(submissions).forEach(sub => {
      grouped[sub.status].push(sub);
    });
    return grouped;
  }, [submissions]);

  if (loading) {
    return <div className="p-8 font-mono text-auib-white">Loading Kanban board...</div>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4 items-start">
        {STATUSES.map(status => (
          <div key={status.id} className="w-80 flex-shrink-0 flex flex-col">
            <h3 className="font-bold text-auib-white mb-3 uppercase tracking-widest flex items-center justify-between border-b-2 border-auib-white pb-2">
              {status.label}
              <span className="bg-auib-white text-auib-charcoal py-0.5 px-2 font-mono text-xs shadow-[2px_2px_0px_0px_#9C213E]">
                {groupedSubmissions[status.id].length}
              </span>
            </h3>

            <Droppable droppableId={status.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[500px] border-2 border-auib-white flex flex-col gap-4 p-4 ${
                    snapshot.isDraggingOver ? 'bg-auib-white/10' : 'bg-transparent'
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
                            className={`bg-auib-white text-auib-charcoal p-4 border-2 border-auib-charcoal transition-transform ${
                              snapshot.isDragging ? 'shadow-[8px_8px_0px_0px_#9C213E] -rotate-1' : 'shadow-[4px_4px_0px_0px_#273237]'
                            }`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <Link href={`/submissions/${sub.id}`}>
                              <h4 className="font-bold uppercase tracking-wide mb-1 hover:text-auib-red transition-colors truncate">{sub.title}</h4>
                            </Link>
                            <div className="flex justify-between items-end mt-4">
                              <span className="text-xs font-mono uppercase tracking-wider bg-auib-charcoal text-auib-white px-2 py-1">
                                {sub.type}
                              </span>
                              {sub.rubric_formatting === 'disqualified' && (
                                <span className="text-xs font-bold text-auib-red uppercase tracking-wider">
                                  Disqualified
                                </span>
                              )}
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
