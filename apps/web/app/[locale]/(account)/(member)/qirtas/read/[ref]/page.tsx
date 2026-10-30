import { Suspense } from "react";
import { PieceReader } from "@/components/nexus/journal/piece";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";
import { RouteParams } from "@/lib/nexus/use-query-param";

export const generateMetadata = titleFrom((t) => t("nexus.journal.title"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParams.Provider value={{ slug: decodeURIComponent(ref) }}>
        <PieceReader />
      </RouteParams.Provider>
    </Suspense>
  );
};

export default Page;
