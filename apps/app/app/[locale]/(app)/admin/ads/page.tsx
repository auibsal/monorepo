import { RequireModule } from "@/components/admin/admin-shell";
import { AdsAdmin } from "@/components/admin/ads";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.ads.title"));

const AdsPage = () => (
  <RequireModule module="ads">
    <AdsAdmin />
  </RequireModule>
);

export default AdsPage;
