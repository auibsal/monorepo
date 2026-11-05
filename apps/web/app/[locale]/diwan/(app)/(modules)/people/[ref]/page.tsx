import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MemberDetail } from "@/components/diwan/admin/members/member";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.admin.member.title"));

const MemberPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="members">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef back="/people" value={decodeURIComponent(ref)}>
          <MemberDetail />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default MemberPage;
