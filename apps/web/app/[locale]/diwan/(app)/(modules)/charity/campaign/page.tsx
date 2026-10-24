import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CampaignAdmin } from "@/components/nexus/admin/charity/campaign";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.charity.campaigns")
);

const CampaignPage = () => (
  <RequireModule module="charity">
    <Suspense fallback={<SectionSpinner />}>
      <CampaignAdmin />
    </Suspense>
  </RequireModule>
);

export default CampaignPage;
