import { Documents } from "@/components/nexus/documents/documents";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.documents.title"));

const DocumentsPage = () => <Documents />;

export default DocumentsPage;
