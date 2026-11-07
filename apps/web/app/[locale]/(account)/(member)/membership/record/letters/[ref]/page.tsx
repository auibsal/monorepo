import { Suspense } from "react";
import { ServiceLetter } from "@/components/diwan/certificates/service-letter";
import { RouteParamsProvider } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.serviceLetter.title")
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
        <ServiceLetter />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
