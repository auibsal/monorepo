import { Suspense } from "react";
import { ViewForm } from "@/components/diwan/forms/view";
import { RouteParamsProvider } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.forms.viewTitle"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParamsProvider value={{ id: decodeURIComponent(ref) }}>
        <ViewForm />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
