import { AdminOverview } from "@/components/diwan/admin/overview";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.overview.title")
);

/** The Diwan's front page, for every officer: figures their roles open, and what they can start. */
const DiwanHome = () => <AdminOverview />;

export default DiwanHome;
