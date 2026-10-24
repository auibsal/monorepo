import { AuthFrame } from "@/components/nexus/auth/auth-frame";
import { ResetForm } from "@/components/nexus/auth/reset-form";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("auth.reset.title"));

const ResetPage = () => (
  <AuthFrame>
    <ResetForm />
  </AuthFrame>
);

export default ResetPage;
