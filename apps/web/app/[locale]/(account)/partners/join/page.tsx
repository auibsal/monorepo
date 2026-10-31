import { PartnerJoin } from "@/components/account/partner-join";
import { titleFrom } from "@/lib/nexus/metadata";

const metadataFrom = titleFrom((t) => t("nexus.partnerJoin.title"));

/** Public, unlike the members' pages: search engines may list it. */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

const PartnerJoinPage = () => (
  <main
    className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
    id="main"
  >
    <PartnerJoin />
  </main>
);

export default PartnerJoinPage;
