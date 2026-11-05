import { Link } from "@/lib/diwan/navigation";

export const EntryLink = ({ id, label }: { id: string; label: string }) => (
  <Link
    className="font-medium underline underline-offset-4"
    href={`/qirtas/entries/${id}`}
  >
    {label}
  </Link>
);
