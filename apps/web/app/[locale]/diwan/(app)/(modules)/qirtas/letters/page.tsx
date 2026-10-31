import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { QirtasNewsroom } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.desks.letters")
);

const SectionPage = () => (
  <RequireModule module="journal">
    <QirtasNewsroom desk="letters" />
  </RequireModule>
);

export default SectionPage;
