import { Suspense } from "react";
import { QirtasWrite } from "@/components/nexus/journal/submit";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.journal.title"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <QirtasWrite />
  </Suspense>
);

export default Page;
