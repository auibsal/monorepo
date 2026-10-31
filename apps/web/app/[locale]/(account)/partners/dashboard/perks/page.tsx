import { PartnerPerks } from "@/components/nexus/partner/workspace";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.partnerDesk.tabs.perks")
);

const Page = () => <PartnerPerks />;

export default Page;
