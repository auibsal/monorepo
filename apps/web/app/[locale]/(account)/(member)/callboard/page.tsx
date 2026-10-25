import { Callboard } from "@/components/nexus/programmes/callboard";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.callboard.title"));

const CallboardPage = () => <Callboard />;

export default CallboardPage;
