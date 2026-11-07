import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MinutesEditor } from "@/components/diwan/admin/governance/minutes-editor";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.meetings.title")
);

const MinutesPage = () => (
  <RequireModule module="governance">
    <Suspense fallback={<SectionSpinner />}>
      <MinutesEditor />
    </Suspense>
  </RequireModule>
);

export default MinutesPage;
