import { AdminOverview } from "@/components/nexus/admin/overview";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.overview.title")
);

/** The Diwan's front page, for every officer: figures their roles open, and what they can start. */
const DiwanHome = () => <AdminOverview />;

export default DiwanHome;
