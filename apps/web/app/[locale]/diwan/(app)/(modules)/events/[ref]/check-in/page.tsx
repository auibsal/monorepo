import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { CheckInScreen } from "@/components/diwan/admin/events/check-in";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.checkIn.title")
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
