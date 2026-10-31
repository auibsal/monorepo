import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PuzzleEditor } from "@/components/nexus/admin/journal/puzzles";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.waraq.tabs.games")
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
