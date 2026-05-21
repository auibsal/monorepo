import KanbanBoard from './KanbanBoard';

export default function SubmissionsPage() {
  return (
    <div className="space-y-12">
      {/* Architectural Header anchored to dynamic foreground and border tokens */}
      <div className="flex justify-between items-center border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground">Submissions Review</h2>
      </div>
      
      <KanbanBoard />
    </div>
  );
}
