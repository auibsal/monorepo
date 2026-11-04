import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { OpeningsAdmin } from "@/components/nexus/admin/programmes/openings";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.openings.listTitle")
);

/** Every opening on Get involved, in one list (People → Openings). */
const Page = () => (
  <RequireModule module="hiring">
    <OpeningsAdmin />
  </RequireModule>
);

export default Page;
