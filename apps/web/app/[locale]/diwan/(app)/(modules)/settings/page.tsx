import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SettingsAdmin } from "@/components/nexus/admin/system/settings";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.settings.title")
);

const SettingsPage = () => (
  <RequireModule module="settings">
    <SettingsAdmin />
  </RequireModule>
);

export default SettingsPage;
