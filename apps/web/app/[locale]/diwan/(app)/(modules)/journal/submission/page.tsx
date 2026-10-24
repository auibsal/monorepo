import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SubmissionView } from "@/components/nexus/admin/pipeline/intake";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.pipeline.submission.title")
);

const Page = () => (
  <RequireModule module="journal">
    <Suspense fallback={<SectionSpinner />}>
      <SubmissionView />
    </Suspense>
  </RequireModule>
);

export default Page;
