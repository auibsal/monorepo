import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CampaignAdmin } from "@/components/nexus/admin/charity/campaign";
import {
  type CampaignNewTab,
  campaignNewTabs,
} from "@/components/nexus/admin/tabs";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.charity.campaigns")
);

const takesNew = (value: string): value is CampaignNewTab =>
  (campaignNewTabs as readonly string[]).includes(value);

/** A campaign's new ledger entry, receipt or figure, on its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ campaign: string; tab: string }>;
}) => {
  const { campaign, tab } = await params;
  if (!takesNew(tab)) {
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
          <CampaignAdmin item="new" tab={tab} />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
