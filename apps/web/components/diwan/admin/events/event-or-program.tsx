"use client";

import { Suspense } from "react";
import { RecordRef } from "@/components/diwan/record-ref";
import { SectionSpinner } from "@/components/diwan/states";
import { RequireModule } from "../admin-shell";
import { EventEditor } from "./editor";

/**
 * An event under /diwan/events, by its slug (owner, Nov 5, 2026: every
 * event is a standard event with the one page; there are no series pages).
 */
export const EventOrProgram = ({ value }: { readonly value: string }) => (
  <RequireModule module="events">
    <Suspense fallback={<SectionSpinner />}>
      <RecordRef
        back="/events"
        lookup={{ column: "slug", schema: "events", table: "events" }}
        value={value}
      >
        <EventEditor />
      </RecordRef>
    </Suspense>
  </RequireModule>
);
