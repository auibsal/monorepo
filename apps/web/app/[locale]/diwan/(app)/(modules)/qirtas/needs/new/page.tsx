import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewQirtasNeed } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.needs.new"));

/** A new need for the paper, on its own page. */
const Page = () => (
  <RequireModule module="journal">
    <NewQirtasNeed />
  </RequireModule>
);

export default Page;
