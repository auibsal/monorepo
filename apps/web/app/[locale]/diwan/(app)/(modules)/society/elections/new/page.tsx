import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewElection } from "@/components/nexus/admin/governance/elections";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.governance.elections.new")
);

/** A new election, on its own page under Elections. */
const Page = () => (
  <RequireModule module="governance">
    <NewElection />
  </RequireModule>
);

export default Page;
