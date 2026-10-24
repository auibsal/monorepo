import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ContentAdmin } from "@/components/nexus/admin/content/sections";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.content.title")
);

const ContentPage = () => (
  <RequireModule module="content">
    <ContentAdmin />
  </RequireModule>
);

export default ContentPage;
