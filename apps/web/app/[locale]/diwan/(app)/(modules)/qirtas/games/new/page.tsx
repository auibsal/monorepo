import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PuzzleEditor } from "@/components/diwan/admin/journal/puzzles";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.qirtas.tabs.games")
);

const Page = () => (
  <RequireModule module="journal">
    <Suspense fallback={<SectionSpinner />}>
      <PuzzleEditor />
    </Suspense>
  </RequireModule>
);

export default Page;
