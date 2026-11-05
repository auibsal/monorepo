import { Suspense } from "react";
import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { EventEditor } from "@/components/diwan/admin/events/editor";
import { SectionSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.event.editTitle")
);

const EventEditPage = () => (
  <RequireModule module="events">
    <Suspense fallback={<SectionSpinner />}>
      <EventEditor />
    </Suspense>
  </RequireModule>
);

export default EventEditPage;
