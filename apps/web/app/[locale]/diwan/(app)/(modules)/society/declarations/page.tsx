import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyView } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.declarations.title")
);

/** Officers' conflict-of-interest declarations (they were under Partners). */
const Page = () => (
  <RequireModule module="governance">
    <SocietyView view="declarations" />
  </RequireModule>
);

export default Page;
