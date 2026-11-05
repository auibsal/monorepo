import { WriteHome } from "@/components/nexus/journal/write";
import { titleFrom } from "@/lib/nexus/metadata";

const metadataFrom = titleFrom((t) => t("nexus.journal.write.title"));

/**
 * Public, unlike the form pages behind it (owner, Nov 5, 2026): anyone
 * reads what Qirtas takes and how; search engines may list it.
 */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

const Page = () => <WriteHome />;

export default Page;
