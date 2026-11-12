import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { IssueEditor } from "@/components/diwan/admin/journal/editors";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.journal.tabs.issues")
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
          back="/qirtas/editions"
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
