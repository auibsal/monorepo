import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { NewElection } from "@/components/diwan/admin/governance/elections";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.governance.elections.new")
);

/** A new election, on its own page under Elections. */
const Page = () => (
  <RequireModule module="governance">
    <NewElection />
  </RequireModule>
);

export default Page;
