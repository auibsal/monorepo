import { PartnerChecklist } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.checklist")
);

const Page = () => <PartnerChecklist />;

export default Page;
