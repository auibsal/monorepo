import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EventEditor } from "@/components/nexus/admin/events/editor";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.event.editTitle")
);

const EventEditPage = () => (
  <RequireModule module="events">
    <Suspense fallback={<SectionSpinner />}>
      <EventEditor />
    </Suspense>
  </RequireModule>
);

export default EventEditPage;
