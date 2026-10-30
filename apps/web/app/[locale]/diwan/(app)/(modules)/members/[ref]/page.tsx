import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { MemberDetail } from "@/components/nexus/admin/members/member";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.member.title"));

const MemberPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="members">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef back="/members" value={decodeURIComponent(ref)}>
          <MemberDetail />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default MemberPage;
