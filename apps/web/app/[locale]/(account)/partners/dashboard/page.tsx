import { PartnerProfile } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.profile")
);

const Page = () => <PartnerProfile />;

export default Page;
