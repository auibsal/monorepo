import { Suspense } from "react";
import { PieceReader } from "@/components/nexus/journal/piece";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.journal.title"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <PieceReader />
  </Suspense>
);

export default Page;
