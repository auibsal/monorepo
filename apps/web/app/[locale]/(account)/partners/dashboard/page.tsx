import { PartnerProfile } from "@/components/nexus/partner/workspace";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.partnerDesk.tabs.profile")
);

const Page = () => <PartnerProfile />;

export default Page;
