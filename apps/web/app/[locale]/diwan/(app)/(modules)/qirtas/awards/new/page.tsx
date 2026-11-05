import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { NewRound } from "@/components/diwan/admin/journal/awards";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.awards.newRound")
);

/** A new round of the Awards, on its own page. */
const Page = () => (
  <RequireModule module="journal">
    <NewRound />
  </RequireModule>
);

export default Page;
