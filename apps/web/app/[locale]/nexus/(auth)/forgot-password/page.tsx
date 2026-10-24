import { ForgotForm } from "@/components/nexus/auth/forgot-form";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("auth.forgot.title"));

const ForgotPasswordPage = () => <ForgotForm />;

export default ForgotPasswordPage;
