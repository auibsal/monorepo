import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CampaignAdmin } from "@/components/nexus/admin/charity/campaign";
import { type CampaignTab, campaignTabs } from "@/components/nexus/admin/tabs";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.charity.campaigns")
);

const isTab = (value: string): value is CampaignTab =>
  (campaignTabs as readonly string[]).includes(value);

/** One of a campaign's tabs, at its own address. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ campaign: string; tab: string }>;
}) => {
  const { campaign, tab } = await params;
  if (!isTab(tab) || tab === "ledger") {
    notFound();
  }
  return (
    <RequireModule module="charity">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef
          back="/events/second-chapter/collection"
          lookup={{ column: "slug", schema: "charity", table: "campaigns" }}
          value={decodeURIComponent(campaign)}
        >
          <CampaignAdmin tab={tab} />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
