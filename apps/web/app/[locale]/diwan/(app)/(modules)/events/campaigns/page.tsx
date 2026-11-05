import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { CharityAdmin } from "@/components/diwan/admin/charity/list";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.charity.campaigns")
);

/**
 * Second Chapter's campaigns (owner, Nov 5, 2026: no series pages): each
 * campaign is linked to its event, the fair, on the event's page.
 */
const CampaignsPage = () => (
  <RequireModule module="charity">
    <CharityAdmin />
  </RequireModule>
);

export default CampaignsPage;
