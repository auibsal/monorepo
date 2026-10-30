import { GetInvolved } from "@/components/account/get-involved";
import { titleFrom } from "@/lib/nexus/metadata";

const metadataFrom = titleFrom((t) => t("nexus.getInvolved.title"));

/** Public, unlike the members' pages: search engines may list it. */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

const GetInvolvedPage = () => <GetInvolved />;

export default GetInvolvedPage;
