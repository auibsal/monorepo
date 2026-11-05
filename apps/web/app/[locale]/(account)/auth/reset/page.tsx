import { AuthFrame } from "@/components/diwan/auth/auth-frame";
import { ResetForm } from "@/components/diwan/auth/reset-form";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.reset.title"));

const ResetPage = () => (
  <AuthFrame>
    <ResetForm />
  </AuthFrame>
);

export default ResetPage;
