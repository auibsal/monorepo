import { Suspense } from "react";
import { Handbook } from "@/components/nexus/handbook/handbook";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.handbook.title"));

const HandbookPage = () => (
  <Suspense>
    <Handbook />
  </Suspense>
);

export default HandbookPage;
