import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { QirtasNewsroom } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.desks.news")
);

const SectionPage = () => (
  <RequireModule module="journal">
    <QirtasNewsroom desk="news" />
  </RequireModule>
);

export default SectionPage;
