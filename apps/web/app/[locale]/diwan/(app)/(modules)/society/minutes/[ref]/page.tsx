import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { MinutesEditor } from "@/components/nexus/admin/governance/minutes-editor";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.governance.tabs.minutes")
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
