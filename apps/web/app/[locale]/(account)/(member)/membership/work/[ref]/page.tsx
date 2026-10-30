import { Suspense } from "react";
import { MyPiece } from "@/components/nexus/journal/work";
import { RouteParamsProvider } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.waraq.pieceTitle"));

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
