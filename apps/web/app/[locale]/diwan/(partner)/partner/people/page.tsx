import { PartnerPeople } from "@/components/nexus/partner/workspace";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.partnerDesk.tabs.people")
);

const Page = () => <PartnerPeople />;

export default Page;
