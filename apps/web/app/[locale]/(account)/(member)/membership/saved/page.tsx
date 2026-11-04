import { SavedReadingPage } from "@/components/nexus/home/saved-reading";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("web.journal.saved.title"));

/** What a reader saved to read later (the design review A9). */
const Page = () => <SavedReadingPage />;

export default Page;
