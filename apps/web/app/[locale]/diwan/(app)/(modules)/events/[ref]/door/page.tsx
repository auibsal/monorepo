import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CheckInScreen } from "@/components/nexus/admin/events/check-in";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.checkIn.title")
);

const CheckInPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="events">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef
          back="/events"
          lookup={{ column: "slug", schema: "events", table: "events" }}
          value={decodeURIComponent(ref)}
        >
          <CheckInScreen />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default CheckInPage;
