import { Suspense } from "react";
import { RequireModule } from "@/components/admin/admin-shell";
import { PuzzleEditor } from "@/components/admin/journal/puzzles";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.waraq.tabs.games")
);

const Page = () => (
  <RequireModule module="journal">
    <Suspense fallback={<SectionSpinner />}>
      <PuzzleEditor />
    </Suspense>
  </RequireModule>
);

export default Page;
