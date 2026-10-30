import { Suspense } from "react";
import { MySubmission } from "@/components/nexus/journal/pages";
import { RouteParamsProvider } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

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
      <RouteParamsProvider value={{ id: decodeURIComponent(ref) }}>
        <MySubmission />
      </RouteParamsProvider>
    </Suspense>
  );
};

export default Page;
