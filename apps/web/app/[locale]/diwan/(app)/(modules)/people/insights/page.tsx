import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MemberInsights } from "@/components/diwan/admin/members/insights";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.members.insights.title")
);

const InsightsPage = () => (
  <RequireModule module="members">
    <MemberInsights />
  </RequireModule>
);

export default InsightsPage;
