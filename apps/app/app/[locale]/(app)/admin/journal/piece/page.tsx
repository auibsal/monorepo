import { Suspense } from "react";
import { RequireModule } from "@/components/admin/admin-shell";
import { WaraqPieceEditor } from "@/components/admin/journal/piece";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

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
