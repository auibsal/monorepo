import { MemberHome } from "@/components/diwan/home/member-home";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("web.nav.account"));

const HomePage = () => <MemberHome />;

export default HomePage;
