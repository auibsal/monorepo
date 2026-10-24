import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ActivityLog } from "@/components/nexus/admin/system/activity";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.activity.title")
);

const ActivityPage = () => (
  <RequireModule module="activity">
    <ActivityLog />
  </RequireModule>
);

export default ActivityPage;
