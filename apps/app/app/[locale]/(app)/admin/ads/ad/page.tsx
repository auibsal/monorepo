import { Suspense } from "react";
import { RequireModule } from "@/components/admin/admin-shell";
import { AdEditor } from "@/components/admin/ads";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.ads.title"));

const AdPage = () => (
  <RequireModule module="ads">
    <Suspense fallback={<SectionSpinner />}>
      <AdEditor />
    </Suspense>
  </RequireModule>
);

export default AdPage;
