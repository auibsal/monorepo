import { WriteHome } from "@/components/nexus/journal/write";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.journal.write.title")
);

const Page = () => <WriteHome />;

export default Page;
