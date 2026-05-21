import KanbanBoard from './KanbanBoard';

export default function SubmissionsPage() {
  return (
    <div className="space-y-12">
      {/* Architectural Header */}
      <div className="border-auib-charcoal flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-auib-charcoal text-3xl font-bold uppercase tracking-widest">
          Submissions Review
        </h2>
      </div>

      <KanbanBoard />
    </div>
  );
}
