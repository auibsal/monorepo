import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { OpeningsAdmin } from "@/components/diwan/admin/programmes/openings";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programmes.openings.listTitle")
);

/** Every opening on Get involved, in one list (People → Openings). */
const Page = () => (
  <RequireModule module="hiring">
    <OpeningsAdmin />
  </RequireModule>
);

export default Page;
