import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewOpeningPage } from "@/components/nexus/admin/programmes/openings";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.openings.new")
);

/** Posting an opening of any kind, on its own page. */
const Page = () => (
  <RequireModule module="hiring">
    <NewOpeningPage />
  </RequireModule>
);

export default Page;
