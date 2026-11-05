import { PartnerPerks } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.perks")
);

const Page = () => <PartnerPerks />;

export default Page;
