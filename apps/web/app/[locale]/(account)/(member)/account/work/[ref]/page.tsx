import { Suspense } from "react";
import { MyPiece } from "@/components/diwan/journal/work";
import { RouteParamsProvider } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.qirtas.pieceTitle"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParamsProvider value={{ id: decodeURIComponent(ref) }}>
        <MyPiece />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
