import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { RecognitionAdmin } from "@/components/nexus/admin/recognition/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.recognition.tabs.certificates")
);

/** Service: its certificates, at their own address. */
const Page = () => (
  <RequireModule module="recognition">
    <RecognitionAdmin tab="certificates" />
  </RequireModule>
);

export default Page;
