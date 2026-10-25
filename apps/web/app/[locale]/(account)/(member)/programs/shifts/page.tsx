import { Callboard } from "@/components/nexus/programmes/callboard";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.callboard.title"));

// The shifts are on the Callboard now; this address keeps working.
const ShiftsPage = () => <Callboard />;

export default ShiftsPage;
