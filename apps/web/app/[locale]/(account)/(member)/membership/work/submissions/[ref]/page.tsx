import { Suspense } from "react";
import { MySubmission } from "@/components/nexus/journal/pages";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";
import { RouteParams } from "@/lib/nexus/use-query-param";

export const generateMetadata = titleFrom((t) =>
  t("nexus.journal.submissionTitle")
);

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <RouteParams.Provider value={{ id: decodeURIComponent(ref) }}>
        <MySubmission />
      </RouteParams.Provider>
    </Suspense>
  );
};

export default Page;
