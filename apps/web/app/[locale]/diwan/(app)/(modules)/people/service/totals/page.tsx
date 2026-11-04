import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { RecognitionAdmin } from "@/components/nexus/admin/recognition/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.recognition.tabs.totals")
);

/** Service: its totals, at their own address. */
const Page = () => (
  <RequireModule module="recognition">
    <RecognitionAdmin tab="totals" />
  </RequireModule>
);

export default Page;
