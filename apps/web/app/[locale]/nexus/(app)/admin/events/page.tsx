import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EventsList } from "@/components/nexus/admin/events/list";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.events.title"));

const EventsPage = () => (
  <RequireModule module="events">
    <EventsList />
  </RequireModule>
);

export default EventsPage;
