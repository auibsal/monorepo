import { Society } from "@/components/diwan/society/society";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.society.title"));

const SocietyPage = () => <Society />;

export default SocietyPage;
