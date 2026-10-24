import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { JournalAdmin } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.title")
);

const JournalPage = () => (
  <RequireModule module="journal">
    <JournalAdmin />
  </RequireModule>
);

export default JournalPage;
