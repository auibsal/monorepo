import { MemberHome } from "@/components/nexus/home/member-home";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("web.nav.account"));

const HomePage = () => <MemberHome />;

export default HomePage;
