import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { QirtasPieceEditor } from "@/components/diwan/admin/journal/piece";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.journal.tabs.pieces")
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
          <QirtasPieceEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
