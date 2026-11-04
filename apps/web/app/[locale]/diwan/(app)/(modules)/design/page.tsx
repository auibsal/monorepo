import { DesignSystem } from "@/components/nexus/admin/system/design";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.design.title"));

/** The design system, SAL-BRD-01: every officer may open it. */
const DesignPage = () => <DesignSystem />;

export default DesignPage;
