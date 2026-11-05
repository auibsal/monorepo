import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { CampaignAdmin } from "@/components/diwan/admin/charity/campaign";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.charity.campaigns")
);

const CampaignPage = async ({
  params,
}: {
  readonly params: Promise<{ campaign: string }>;
}) => {
  const { campaign } = await params;
  return (
    <RequireModule module="charity">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef
          back="/events/campaigns"
          lookup={{ column: "slug", schema: "charity", table: "campaigns" }}
          value={decodeURIComponent(campaign)}
        >
          <CampaignAdmin />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default CampaignPage;
