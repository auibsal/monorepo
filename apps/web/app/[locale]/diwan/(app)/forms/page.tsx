import { Forms } from "@/components/nexus/forms/forms";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.forms.title"));

const FormsPage = () => <Forms />;

export default FormsPage;
