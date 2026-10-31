import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CampaignAdmin } from "@/components/nexus/admin/charity/campaign";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.charity.campaigns")
);

const CampaignPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="charity">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef
          back="/events/programs/second-chapter?tab=collection"
          lookup={{ column: "slug", schema: "charity", table: "campaigns" }}
          value={decodeURIComponent(ref)}
        >
          <CampaignAdmin />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default CampaignPage;
