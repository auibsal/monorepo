import { Suspense } from "react";
import { MyPiece } from "@/components/journal/work";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.waraq.pieceTitle"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <MyPiece />
  </Suspense>
);

export default Page;
