import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { VerificationQueue } from "@/components/nexus/admin/members/verification";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.verification.title")
);

const VerificationPage = () => (
  <RequireModule module="members">
    <VerificationQueue />
  </RequireModule>
);

export default VerificationPage;
