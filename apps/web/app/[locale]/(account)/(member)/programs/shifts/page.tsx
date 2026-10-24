import { ProgrammesBrowser } from "@/components/nexus/programmes/programmes-browser";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.programs.title"));

const ProgrammesPage = () => <ProgrammesBrowser />;

export default ProgrammesPage;
