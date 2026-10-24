import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { IssueEditor } from "@/components/nexus/admin/journal/editors";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.tabs.issues")
);

const Page = () => (
  <RequireModule module="journal">
    <Suspense fallback={<SectionSpinner />}>
      <IssueEditor />
    </Suspense>
  </RequireModule>
);

export default Page;
