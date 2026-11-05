import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PartnersAdmin } from "@/components/diwan/admin/partners/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.partners.tabs.offers")
);

const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="offers" />
  </RequireModule>
);

export default Page;
