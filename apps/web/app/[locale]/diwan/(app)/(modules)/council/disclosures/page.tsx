import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SocietyView } from "@/components/diwan/admin/governance/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.declarations.title")
);

/** Officers' conflict-of-interest declarations (they were under Partners). */
const Page = () => (
  <RequireModule module="governance">
    <SocietyView view="declarations" />
  </RequireModule>
);

export default Page;
