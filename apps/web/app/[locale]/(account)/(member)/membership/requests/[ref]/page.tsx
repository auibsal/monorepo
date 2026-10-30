import { Suspense } from "react";
import { ViewForm } from "@/components/nexus/forms/view";
import { RouteParamsProvider } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.forms.viewTitle"));

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
