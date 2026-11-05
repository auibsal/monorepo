import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { EventsList } from "@/components/diwan/admin/events/list";
import { ProgramPitches } from "@/components/diwan/admin/programmes/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.admin.events.title"));

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
