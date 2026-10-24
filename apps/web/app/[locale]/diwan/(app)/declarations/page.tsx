import { Declarations } from "@/components/nexus/declarations/declarations";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.declarations.title"));

const DeclarationsPage = () => <Declarations />;

export default DeclarationsPage;
