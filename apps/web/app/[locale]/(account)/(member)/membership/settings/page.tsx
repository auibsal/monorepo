import { SettingsScreen } from "@/components/diwan/profile/settings-screen";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.settings.title"));

const SettingsPage = () => <SettingsScreen />;

export default SettingsPage;
