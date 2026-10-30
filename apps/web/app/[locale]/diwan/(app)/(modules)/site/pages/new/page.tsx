import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PageEditor } from "@/components/nexus/admin/content/page-editor";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.content.tabs.pages")
);

const PageEditPage = () => (
  <RequireModule module="content">
    <Suspense fallback={<SectionSpinner />}>
      <PageEditor />
    </Suspense>
  </RequireModule>
);

export default PageEditPage;
