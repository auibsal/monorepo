import { AccountHome } from "@/components/account/account-pages";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.accountHome.title"));

const Page = () => <AccountHome />;

export default Page;
