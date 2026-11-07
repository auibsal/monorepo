import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { RecognitionAdmin } from "@/components/diwan/admin/recognition/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.recognition.title")
);

const RecognitionPage = () => (
  <RequireModule module="recognition">
    <RecognitionAdmin />
  </RequireModule>
);

export default RecognitionPage;
