import { PartnerEvents } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.events")
);

const Page = () => <PartnerEvents />;

export default Page;
