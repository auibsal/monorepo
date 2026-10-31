import { AccountSettings } from "@/components/account/account-pages";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.settings.title"));

const Page = () => <AccountSettings />;

export default Page;
