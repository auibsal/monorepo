import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { QirtasNewsroom } from "@/components/diwan/admin/journal/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.journal.desks.news")
);

const SectionPage = () => (
  <RequireModule module="journal">
    <QirtasNewsroom desk="news" />
  </RequireModule>
);

export default SectionPage;
