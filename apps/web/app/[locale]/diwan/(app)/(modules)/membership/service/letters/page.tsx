import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { RecognitionAdmin } from "@/components/diwan/admin/recognition/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.recognition.tabs.letters")
);

/** Service letters (service-letter), written by the Director of Membership. */
const Page = () => (
  <RequireModule module="recognition">
    <RecognitionAdmin tab="letters" />
  </RequireModule>
);

export default Page;
