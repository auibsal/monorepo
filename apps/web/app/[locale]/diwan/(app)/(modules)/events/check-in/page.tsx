import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CheckInScreen } from "@/components/nexus/admin/events/check-in";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.checkIn.title")
);

const CheckInPage = () => (
  <RequireModule module="events">
    <Suspense fallback={<SectionSpinner />}>
      <CheckInScreen />
    </Suspense>
  </RequireModule>
);

export default CheckInPage;
