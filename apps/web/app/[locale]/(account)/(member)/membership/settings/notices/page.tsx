import { NoticesScreen } from "@/components/nexus/profile/settings-screen";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.settings.notices"));

const NoticesPage = () => <NoticesScreen />;

export default NoticesPage;
