import { PartnerJoin } from "@/components/account/partner-join";
import { titleFrom } from "@/lib/nexus/metadata";

const metadataFrom = titleFrom((t) => t("nexus.partnerJoin.title"));

/** Public, unlike the members' pages: search engines may list it. */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

const PartnerJoinPage = () => <PartnerJoin />;

export default PartnerJoinPage;
