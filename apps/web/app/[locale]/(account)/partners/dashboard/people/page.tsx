import { PartnerPeople } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.people")
);

const Page = () => <PartnerPeople />;

export default Page;
