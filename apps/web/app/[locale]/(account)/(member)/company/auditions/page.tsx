import { Productions } from "@/components/diwan/productions/productions";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.productions.title"));

const ProductionsPage = () => <Productions />;

export default ProductionsPage;
