import { WriteHome } from "@/components/diwan/journal/write";
import { titleFrom } from "@/lib/diwan/metadata";

const metadataFrom = titleFrom((t) => t("diwan.journal.write.title"));

/**
 * Public, unlike the form pages behind it (decisions.md): anyone
 * reads what Qirtas takes and how; search engines may list it.
 */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

const Page = () => <WriteHome />;

export default Page;
