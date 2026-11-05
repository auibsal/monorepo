import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { ProductionsAdmin } from "@/components/diwan/admin/productions/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.productions.title")
);

const ProductionsPage = () => (
  <RequireModule module="productions">
    <ProductionsAdmin />
  </RequireModule>
);

export default ProductionsPage;
