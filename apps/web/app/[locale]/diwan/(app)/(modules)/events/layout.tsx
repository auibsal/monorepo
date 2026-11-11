import type { ReactNode } from "react";

/** Events: one page, events and the programs that are their series. */
const EventsLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">{children}</div>
);

export default EventsLayout;
