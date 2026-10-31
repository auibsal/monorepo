import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { QirtasReview } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.sections.tabs.review")
);

const ReviewPage = () => (
  <RequireModule module="journal">
    <QirtasReview />
  </RequireModule>
);

export default ReviewPage;
