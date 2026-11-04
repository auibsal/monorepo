import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewCertificate } from "@/components/nexus/admin/recognition/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.recognition.certificates.prepare")
);

/** A certificate, drafted on its own page under Certificates. */
const Page = () => (
  <RequireModule module="recognition">
    <NewCertificate />
  </RequireModule>
);

export default Page;
