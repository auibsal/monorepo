import { CardPage } from "@/components/account/card";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.nav.card"));

/** Card (decisions.md, Your account): the membership card and its Wallet pass. */
const Page = () => <CardPage />;

export default Page;
