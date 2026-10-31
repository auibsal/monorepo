import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EventsList } from "@/components/nexus/admin/events/list";
import { ProgramPitches } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.events.title"));

/**
 * What's on, one page (owner, Oct 31, 2026): the events, with the programs
 * linked under the title (each an event series at /diwan/events/<slug>),
 * then the pitches for new ones.
 */
const EventsPage = () => (
  <RequireModule module="events">
    <div className="grid gap-14">
      <EventsList />
      <ProgramPitches />
    </div>
  </RequireModule>
);

export default EventsPage;
