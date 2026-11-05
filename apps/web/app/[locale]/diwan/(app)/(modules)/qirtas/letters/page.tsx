import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { QirtasNewsroom } from "@/components/diwan/admin/journal/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.journal.desks.letters")
);

const SectionPage = () => (
  <RequireModule module="journal">
    <QirtasNewsroom desk="letters" />
  </RequireModule>
);

export default SectionPage;
