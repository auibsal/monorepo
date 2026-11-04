import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewRound } from "@/components/nexus/admin/journal/awards";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.awards.newRound")
);

/** A new round of the Awards, on its own page. */
const Page = () => (
  <RequireModule module="journal">
    <NewRound />
  </RequireModule>
);

export default Page;
