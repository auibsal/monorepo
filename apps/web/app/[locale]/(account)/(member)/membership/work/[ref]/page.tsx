import { Suspense } from "react";
import { MyPiece } from "@/components/nexus/journal/work";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";
import { RouteParams } from "@/lib/nexus/use-query-param";

export const generateMetadata = titleFrom((t) => t("nexus.waraq.pieceTitle"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParams.Provider value={{ id: decodeURIComponent(ref) }}>
        <MyPiece />
      </RouteParams.Provider>
    </Suspense>
  );
};

export default Page;
