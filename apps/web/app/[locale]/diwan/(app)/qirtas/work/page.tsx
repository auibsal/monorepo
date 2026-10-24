import { Suspense } from "react";
import { MyPiece } from "@/components/nexus/journal/work";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.waraq.pieceTitle"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <MyPiece />
  </Suspense>
);

export default Page;
