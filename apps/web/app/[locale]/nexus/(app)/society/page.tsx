import { Society } from "@/components/nexus/society/society";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.society.title"));

const SocietyPage = () => <Society />;

export default SocietyPage;
