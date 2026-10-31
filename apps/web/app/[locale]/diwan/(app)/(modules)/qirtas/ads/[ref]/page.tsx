import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { AdEditor } from "@/components/nexus/admin/ads";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.ads.title"));

const AdPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="ads">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef back="/qirtas/ads" value={decodeURIComponent(ref)}>
          <AdEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default AdPage;
