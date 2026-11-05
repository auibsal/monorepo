import { ForgotForm } from "@/components/diwan/auth/forgot-form";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.forgot.title"));

const ForgotPasswordPage = () => <ForgotForm />;

export default ForgotPasswordPage;
