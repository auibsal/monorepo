import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProductionsAdmin } from "@/components/nexus/admin/productions/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.productions.title")
);

const ProductionsPage = () => (
  <RequireModule module="productions">
    <ProductionsAdmin />
  </RequireModule>
);

export default ProductionsPage;
