import { Suspense } from "react";
import { Certificate } from "@/components/diwan/certificates/certificate";
import { RouteParamsProvider } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.certificate.title"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParamsProvider value={{ id: decodeURIComponent(ref) }}>
        <Certificate />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
