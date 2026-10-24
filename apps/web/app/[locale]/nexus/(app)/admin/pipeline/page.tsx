import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PipelineAdmin } from "@/components/nexus/admin/pipeline/pipeline";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.pipeline.title")
);

const Page = () => (
  <RequireModule module="pipeline">
    <PipelineAdmin />
  </RequireModule>
);

export default Page;
