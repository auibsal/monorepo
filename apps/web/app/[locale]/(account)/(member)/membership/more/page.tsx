import { TellUsMore } from "@/components/nexus/profile/tell-us-more";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.more.title"));

const MorePage = () => <TellUsMore />;

export default MorePage;
