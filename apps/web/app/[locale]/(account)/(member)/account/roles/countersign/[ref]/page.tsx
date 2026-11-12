import { Suspense } from "react";
import { RouteParamsProvider } from "@/components/diwan/record-ref";
import { Countersign } from "@/components/diwan/service/roles";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.service.handover.title")
);

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParamsProvider value={{ id: decodeURIComponent(ref) }}>
        <Countersign />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
