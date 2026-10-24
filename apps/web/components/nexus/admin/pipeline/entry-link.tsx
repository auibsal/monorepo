import { Link } from "@/lib/nexus/navigation";

export const EntryLink = ({ id, label }: { id: string; label: string }) => (
  <Link
    className="font-medium underline underline-offset-4"
    href={{ pathname: "/journal/entry", query: { id } }}
  >
    {label}
  </Link>
);
