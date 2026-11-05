import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PuzzleEditor } from "@/components/diwan/admin/journal/puzzles";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.qirtas.tabs.games")
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
          back="/qirtas/games"
          lookup={{ column: "slug", schema: "journal", table: "puzzles" }}
          value={decodeURIComponent(ref)}
        >
          <PuzzleEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
