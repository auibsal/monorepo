import { PartnerEvents } from "@/components/nexus/partner/workspace";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.partnerDesk.tabs.events")
);

const Page = () => <PartnerEvents />;

export default Page;
