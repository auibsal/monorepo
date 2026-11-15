import { NewEvent } from "@/components/diwan/admin/events/new-event";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.event.facts.newTitle")
);

const Page = () => <NewEvent />;

export default Page;
