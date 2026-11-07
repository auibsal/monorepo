import { NoticesScreen } from "@/components/diwan/profile/settings-screen";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.settings.notices"));

const NoticesPage = () => <NoticesScreen />;

export default NoticesPage;
