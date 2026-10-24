import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { AdsAdmin } from "@/components/nexus/admin/ads";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.ads.title"));

const AdsPage = () => (
  <RequireModule module="ads">
    <AdsAdmin />
  </RequireModule>
);

export default AdsPage;
