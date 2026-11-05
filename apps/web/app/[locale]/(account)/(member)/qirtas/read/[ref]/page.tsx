import { Suspense } from "react";
import { PieceReader } from "@/components/diwan/journal/piece";
import { RouteParamsProvider } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.journal.title"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParamsProvider value={{ slug: decodeURIComponent(ref) }}>
        <PieceReader />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
