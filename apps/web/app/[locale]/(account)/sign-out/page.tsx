import { SignOut } from "@/components/account/sign-out";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.signOut"));

/**
 * /sign-out (decisions.md, The site): the account menu's last item. It
 * ends the session on this device and says so.
 */
const SignOutPage = () => <SignOut />;

export default SignOutPage;
