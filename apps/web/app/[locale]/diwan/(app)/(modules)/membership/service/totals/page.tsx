import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { RecognitionAdmin } from "@/components/diwan/admin/recognition/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.recognition.tabs.totals")
);

/** Service: its totals, at their own address. */
const Page = () => (
  <RequireModule module="recognition">
    <RecognitionAdmin tab="totals" />
  </RequireModule>
);

export default Page;
