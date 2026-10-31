import type { ReactNode } from "react";
import { EventsTabs } from "@/components/nexus/admin/section-tabs";

const EventsLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <EventsTabs />
    {children}
  </div>
);

export default EventsLayout;
