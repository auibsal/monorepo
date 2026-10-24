import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { RecognitionAdmin } from "@/components/nexus/admin/recognition/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.recognition.title")
);

const RecognitionPage = () => (
  <RequireModule module="recognition">
    <RecognitionAdmin />
  </RequireModule>
);

export default RecognitionPage;
