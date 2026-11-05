import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MinutesEditor } from "@/components/diwan/admin/governance/minutes-editor";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.meetings.title")
);

const MinutesPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="governance">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef back="/society" value={decodeURIComponent(ref)}>
          <MinutesEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default MinutesPage;
