import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { QirtasNewsroom } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.sections.tabs.newsroom")
);

const NewsroomPage = () => (
  <RequireModule module="journal">
    <QirtasNewsroom />
  </RequireModule>
);

export default NewsroomPage;
