import { Suspense } from "react";
import { PieceReader } from "@/components/nexus/journal/piece";
import { RouteParamsProvider } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.journal.title"));

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
