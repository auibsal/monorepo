import { Suspense } from "react";
import { SubmitByDesk } from "@/components/nexus/journal/submit";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.journal.submitTitle")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <SubmitByDesk />
  </Suspense>
);

export default Page;
