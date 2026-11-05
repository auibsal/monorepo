import { Forms } from "@/components/diwan/forms/forms";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.forms.title"));

const FormsPage = () => <Forms />;

export default FormsPage;
