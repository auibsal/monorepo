import { PartnerMemorandum } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.memorandum")
);

const Page = () => <PartnerMemorandum />;

export default Page;
