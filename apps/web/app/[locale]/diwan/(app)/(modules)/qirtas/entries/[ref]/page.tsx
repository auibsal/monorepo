import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EntryView } from "@/components/nexus/admin/pipeline/entry";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.pipeline.entry.title")
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
          <EntryView />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
