import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { IssueEditor } from "@/components/diwan/admin/journal/editors";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.journal.tabs.issues")
);

const Page = () => (
  <RequireModule module="journal">
    <Suspense fallback={<SectionSpinner />}>
      <IssueEditor />
    </Suspense>
  </RequireModule>
);

export default Page;
