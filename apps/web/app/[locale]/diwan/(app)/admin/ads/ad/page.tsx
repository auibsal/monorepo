import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { AdEditor } from "@/components/nexus/admin/ads";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.ads.title"));

const AdPage = () => (
  <RequireModule module="ads">
    <Suspense fallback={<SectionSpinner />}>
      <AdEditor />
    </Suspense>
  </RequireModule>
);

export default AdPage;
