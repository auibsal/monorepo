import { EventsBrowser } from "@/components/nexus/events/events-browser";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.events.title"));

const EventsPage = () => <EventsBrowser />;

export default EventsPage;
