import KanbanBoard from './KanbanBoard';

export default function SubmissionsPage() {
  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="flex justify-between items-center border-b-4 border-auib-charcoal pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Submissions Review</h2>
      </div>
      
      <KanbanBoard />
    </div>
  );
}
