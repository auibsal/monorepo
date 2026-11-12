import { DocumentsPage } from "@/components/diwan/service/service";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.service.title"));

/** Documents (decisions.md, Your account): everything signed, and the certificates. */
const Page = () => <DocumentsPage />;

export default Page;
