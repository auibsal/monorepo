import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { QalamRoster } from "@/components/diwan/admin/journal/qalam";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.qalam")
);

const QalamPage = () => (
  <RequireModule module="qalam">
    <QalamRoster />
  </RequireModule>
);

export default QalamPage;
