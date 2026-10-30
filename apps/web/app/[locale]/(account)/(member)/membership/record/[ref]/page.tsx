import { Suspense } from "react";
import { Certificate } from "@/components/nexus/certificates/certificate";
import { RouteParamsProvider } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.certificate.title"));

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
