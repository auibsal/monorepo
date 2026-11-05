import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { QirtasNewsroom } from "@/components/diwan/admin/journal/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.newsroom")
);

const NewsroomPage = () => (
  <RequireModule module="journal">
    <QirtasNewsroom />
  </RequireModule>
);

export default NewsroomPage;
