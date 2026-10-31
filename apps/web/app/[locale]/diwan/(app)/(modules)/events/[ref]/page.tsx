import { EventOrProgram } from "@/components/nexus/admin/events/event-or-program";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.events.title"));

/**
 * One address for an event or a program (owner, Oct 31, 2026: What's on is
 * one thing): a program is an event series, at /diwan/events/<slug> like
 * its public page; a slug names one or the other, never both.
 */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return <EventOrProgram value={decodeURIComponent(ref)} />;
};

export default Page;
