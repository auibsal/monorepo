import { Suspense } from "react";
import { SubmitByDesk } from "@/components/journal/submit";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.journal.submitTitle")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <SubmitByDesk />
  </Suspense>
);

export default Page;
