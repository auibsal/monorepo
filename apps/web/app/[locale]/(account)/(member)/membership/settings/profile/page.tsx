import { ProfileScreen } from "@/components/diwan/profile/profile-screen";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.profile.title"));

const ProfilePage = () => <ProfileScreen />;

export default ProfilePage;
