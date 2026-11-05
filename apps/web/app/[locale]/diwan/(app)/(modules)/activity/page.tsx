import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { ActivityLog } from "@/components/diwan/admin/system/activity";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.activity.title")
);

const ActivityPage = () => (
  <RequireModule module="activity">
    <ActivityLog />
  </RequireModule>
);

export default ActivityPage;
