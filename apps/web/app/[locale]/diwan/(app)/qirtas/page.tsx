import { JournalHome } from "@/components/nexus/journal/pages";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.journal.title"));

const JournalHomePage = () => <JournalHome />;

export default JournalHomePage;
