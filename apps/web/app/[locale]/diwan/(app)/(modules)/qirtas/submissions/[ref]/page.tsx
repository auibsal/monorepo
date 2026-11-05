import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SubmissionView } from "@/components/diwan/admin/pipeline/intake";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.pipeline.submission.title")
);

const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="journal">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef back="/qirtas" value={decodeURIComponent(ref)}>
          <SubmissionView />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
