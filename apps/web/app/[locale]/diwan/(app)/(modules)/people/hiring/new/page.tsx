import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewRolePage } from "@/components/nexus/admin/members/hiring";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.hiring.post"));

/** Posting a role, on its own page under Hiring. */
const Page = () => (
  <RequireModule module="hiring">
    <NewRolePage />
  </RequireModule>
);

export default Page;
