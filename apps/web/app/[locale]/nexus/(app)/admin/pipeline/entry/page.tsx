import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EntryView } from "@/components/nexus/admin/pipeline/entry";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.pipeline.entry.title")
);

const Page = () => (
  <RequireModule module="pipeline">
    <Suspense fallback={<SectionSpinner />}>
      <EntryView />
    </Suspense>
  </RequireModule>
);

export default Page;
