import { SavedPage } from "@/components/account/saved";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.nav.saved"));

/** Saved (decisions.md, Your account): what was saved to read later. */
const Page = () => <SavedPage />;

export default Page;
