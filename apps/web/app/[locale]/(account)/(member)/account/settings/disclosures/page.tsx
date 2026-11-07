import { Declarations } from "@/components/diwan/declarations/declarations";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.declarations.title"));

const DeclarationsPage = () => <Declarations />;

export default DeclarationsPage;
