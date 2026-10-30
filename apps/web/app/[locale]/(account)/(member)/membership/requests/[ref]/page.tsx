import { Suspense } from "react";
import { ViewForm } from "@/components/nexus/forms/view";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";
import { RouteParams } from "@/lib/nexus/use-query-param";

export const generateMetadata = titleFrom((t) => t("nexus.forms.viewTitle"));

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParams.Provider value={{ id: decodeURIComponent(ref) }}>
        <ViewForm />
      </RouteParams.Provider>
    </Suspense>
  );
};

export default Page;
