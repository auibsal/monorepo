import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { HiringAdmin } from "@/components/nexus/admin/members/hiring";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.hiring.title"));

const HiringPage = () => (
  <RequireModule module="hiring">
    <HiringAdmin />
  </RequireModule>
);

export default HiringPage;
