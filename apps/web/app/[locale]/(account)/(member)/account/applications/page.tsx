import { Applications } from "@/components/account/applications";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.getInvolved.applications.title")
);

/** /account/applications: where each application stands (decisions §18). */
const ApplicationsPage = () => <Applications />;

export default ApplicationsPage;
