import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { NewCertificate } from "@/components/diwan/admin/recognition/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.recognition.certificates.prepare")
);

/** A certificate, drafted on its own page under Certificates. */
const Page = () => (
  <RequireModule module="recognition">
    <NewCertificate />
  </RequireModule>
);

export default Page;
