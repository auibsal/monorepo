import KanbanBoard from './KanbanBoard';

export default function SubmissionsPage() {
  return (
    <div className="space-y-12">
      {/* Architectural Header anchored to dynamic foreground and border tokens */}
      <div className="flex items-center justify-between border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold tracking-widest text-foreground uppercase">
          Submissions Review
        </h2>
      </div>

      <KanbanBoard />
    </div>
  );
}
