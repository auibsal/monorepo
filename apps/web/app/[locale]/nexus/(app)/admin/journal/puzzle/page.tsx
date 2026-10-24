import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PuzzleEditor } from "@/components/nexus/admin/journal/puzzles";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

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
