import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { WaraqPieceEditor } from "@/components/nexus/admin/journal/piece";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.tabs.pieces")
);

const Page = () => (
  <RequireModule module="journal">
    <Suspense fallback={<SectionSpinner />}>
      <WaraqPieceEditor />
    </Suspense>
  </RequireModule>
);

export default Page;
