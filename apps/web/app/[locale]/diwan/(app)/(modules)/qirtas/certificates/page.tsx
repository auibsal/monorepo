import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { CertificatesAdmin } from "@/components/diwan/admin/recognition/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.recognition.tabs.certificates")
);

/** Qirtas → Certificates: Qalam and the Mutanabbi Prize. */
const Page = () => (
  <RequireModule module="recognition">
    <CertificatesAdmin />
  </RequireModule>
);

export default Page;
