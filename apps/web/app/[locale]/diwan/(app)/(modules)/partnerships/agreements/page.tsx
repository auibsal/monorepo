import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PartnersAdmin } from "@/components/diwan/admin/partners/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.partners.tabs.agreements")
);

const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="agreements" />
  </RequireModule>
);

export default Page;
