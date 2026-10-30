import { Suspense } from "react";
import { YourWork } from "@/components/nexus/journal/pages";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.journal.write.yourWork")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <YourWork />
  </Suspense>
);

export default Page;
