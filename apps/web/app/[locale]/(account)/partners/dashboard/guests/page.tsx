import { PartnerGuests } from "@/components/diwan/partner/workspace";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.partnerDesk.tabs.guests")
);

const Page = () => <PartnerGuests />;

export default Page;
