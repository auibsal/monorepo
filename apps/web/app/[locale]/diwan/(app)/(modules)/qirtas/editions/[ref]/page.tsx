import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { IssueEditor } from "@/components/nexus/admin/journal/editors";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.tabs.issues")
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
        <RecordRef
          back="/qirtas?tab=editions"
          lookup={{ column: "slug", schema: "journal", table: "issues" }}
          value={decodeURIComponent(ref)}
        >
          <IssueEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
