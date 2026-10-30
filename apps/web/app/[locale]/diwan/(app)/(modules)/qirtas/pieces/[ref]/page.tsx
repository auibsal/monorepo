import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { WaraqPieceEditor } from "@/components/nexus/admin/journal/piece";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.tabs.pieces")
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
          back="/qirtas"
          lookup={{ column: "slug", schema: "journal", table: "pieces" }}
          value={decodeURIComponent(ref)}
        >
          <WaraqPieceEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
