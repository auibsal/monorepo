import { DesignSystem } from "@/components/diwan/admin/system/design";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.admin.design.title"));

/** The design system, SAL-MED-02: every officer may open it. */
const DesignPage = () => <DesignSystem />;

export default DesignPage;
