import { Suspense } from "react";
import { MySubmission } from "@/components/nexus/journal/pages";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.journal.submissionTitle")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <MySubmission />
  </Suspense>
);

export default Page;
