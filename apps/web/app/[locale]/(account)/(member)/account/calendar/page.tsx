import { EventsBrowser } from "@/components/diwan/events/events-browser";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.events.title"));

const EventsPage = () => <EventsBrowser />;

export default EventsPage;
