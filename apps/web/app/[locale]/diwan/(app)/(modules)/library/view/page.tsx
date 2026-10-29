import { Suspense } from "react";
import { DocumentView } from "@/components/nexus/documents/documents";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.documents.title"));

const DocumentViewPage = () => (
  <Suspense>
    <DocumentView />
  </Suspense>
);

export default DocumentViewPage;
