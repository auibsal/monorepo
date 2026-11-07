import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PartnersAdmin } from "@/components/diwan/admin/partners/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.partners.tabs.applications")
);

/** Partner applications, the first view of Partners. */
const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="applications" />
  </RequireModule>
);

export default Page;
