import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { LetterWriterPage } from "@/components/diwan/admin/recognition/letter-writer";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.recognition.letterWriter.title")
);

/** Any of the register's letters, on the one letter template. */
const Page = () => (
  <RequireModule module="recognition">
    <LetterWriterPage />
  </RequireModule>
);

export default Page;
