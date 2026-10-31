import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { QirtasEditions } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.sections.tabs.editions")
);

const EditionsPage = () => (
  <RequireModule module="journal">
    <QirtasEditions />
  </RequireModule>
);

export default EditionsPage;
