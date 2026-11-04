import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewReelPage } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.reels.new")
);

/** A new Next Stop reel, on its own page under Video. */
const Page = () => (
  <RequireModule module="journal">
    <NewReelPage />
  </RequireModule>
);

export default Page;
