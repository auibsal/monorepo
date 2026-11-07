import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { NewOpeningPage } from "@/components/diwan/admin/programmes/openings";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programmes.openings.new")
);

/** Posting an opening of any kind, on its own page. */
const Page = () => (
  <RequireModule module="hiring">
    <NewOpeningPage />
  </RequireModule>
);

export default Page;
