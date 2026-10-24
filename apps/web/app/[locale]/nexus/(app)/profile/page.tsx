import { ProfileScreen } from "@/components/nexus/profile/profile-screen";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.profile.title"));

const ProfilePage = () => <ProfileScreen />;

export default ProfilePage;
