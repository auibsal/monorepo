import { LogHours } from "@/components/nexus/service/service";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.service.logTitle"));

/** Service hours, logged on their own page under Record. */
const Page = () => <LogHours />;

export default Page;
