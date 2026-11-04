import { PartnerNewPerk } from "@/components/nexus/partner/workspace";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.partnerDesk.perks.new")
);

/** A partner's new perk, on its own page under Perks. */
const Page = () => <PartnerNewPerk />;

export default Page;
