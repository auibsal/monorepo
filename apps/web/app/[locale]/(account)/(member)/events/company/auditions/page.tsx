import { Productions } from "@/components/nexus/productions/productions";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.productions.title"));

const ProductionsPage = () => <Productions />;

export default ProductionsPage;
