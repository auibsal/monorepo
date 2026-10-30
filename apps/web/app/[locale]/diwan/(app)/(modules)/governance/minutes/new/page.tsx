import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { MinutesEditor } from "@/components/nexus/admin/governance/minutes-editor";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.governance.tabs.minutes")
);

const MinutesPage = () => (
  <RequireModule module="governance">
    <Suspense fallback={<SectionSpinner />}>
      <MinutesEditor />
    </Suspense>
  </RequireModule>
);

export default MinutesPage;
