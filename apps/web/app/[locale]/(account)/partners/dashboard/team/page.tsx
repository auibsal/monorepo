import { PartnerTeam } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.team")
);

const Page = () => <PartnerTeam />;

export default Page;
