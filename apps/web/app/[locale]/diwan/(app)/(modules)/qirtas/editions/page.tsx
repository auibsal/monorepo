import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { QirtasEditions } from "@/components/diwan/admin/journal/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.editions")
);

const EditionsPage = () => (
  <RequireModule module="journal">
    <QirtasEditions />
  </RequireModule>
);

export default EditionsPage;
