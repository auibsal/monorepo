import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { MemberInsights } from "@/components/nexus/admin/members/insights";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.members.insights.title")
);

const InsightsPage = () => (
  <RequireModule module="members">
    <MemberInsights />
  </RequireModule>
);

export default InsightsPage;
