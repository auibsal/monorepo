import { WorkPage } from "@/components/account/work";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.journal.write.yourWork")
);

/**
 * Your work (/account/work, decisions §6): drafts, what you sent to Qirtas
 * and its pieces, then what you saved to read later.
 */
const Page = () => <WorkPage />;

export default Page;
