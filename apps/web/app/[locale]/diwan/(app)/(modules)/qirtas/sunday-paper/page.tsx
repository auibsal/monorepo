import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SundayPaperComposer } from "@/components/diwan/admin/journal/sunday-paper";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.sundayPaper")
);

const SundayPaperPage = () => (
  <RequireModule module="journal">
    <SundayPaperComposer />
  </RequireModule>
);

export default SundayPaperPage;
