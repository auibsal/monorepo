import { SettingsScreen } from "@/components/nexus/profile/settings-screen";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.settings.title"));

const SettingsPage = () => <SettingsScreen />;

export default SettingsPage;
