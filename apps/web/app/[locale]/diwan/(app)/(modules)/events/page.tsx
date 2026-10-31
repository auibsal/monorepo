import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EventsList } from "@/components/nexus/admin/events/list";
import { ProgramsIndex } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.events.title"));

/**
 * What's on, one page (owner, Oct 31, 2026): the events, then the programs,
 * each an event series with its own page at /diwan/events/<slug>.
 */
const EventsPage = () => (
  <RequireModule module="events">
    <div className="grid gap-14">
      <EventsList />
      <ProgramsIndex />
    </div>
  </RequireModule>
);

export default EventsPage;
