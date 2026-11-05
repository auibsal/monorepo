import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { CampaignAdmin } from "@/components/diwan/admin/charity/campaign";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.charity.campaigns")
);

const CampaignPage = () => (
  <RequireModule module="charity">
    <Suspense fallback={<SectionSpinner />}>
      <CampaignAdmin />
    </Suspense>
  </RequireModule>
);

export default CampaignPage;
