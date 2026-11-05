import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { NewReelPage } from "@/components/diwan/admin/programmes/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programmes.reels.new")
);

/** A new Next Stop reel, on its own page under Video. */
const Page = () => (
  <RequireModule module="journal">
    <NewReelPage />
  </RequireModule>
);

export default Page;
