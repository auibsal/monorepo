import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { MemberDetail } from "@/components/nexus/admin/members/member";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.member.title"));

const MemberPage = () => (
  <RequireModule module="members">
    <Suspense fallback={<SectionSpinner />}>
      <MemberDetail />
    </Suspense>
  </RequireModule>
);

export default MemberPage;
