"use client";

import { useAuth } from "@repo/auth/provider";
import { unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { RecordRef } from "@/components/nexus/record-ref";
import { ErrorState, SectionSpinner } from "@/components/nexus/states";
import { RequireModule } from "../admin-shell";
import { ProgramPage } from "../programmes/admin";
import { EventEditor } from "./editor";

/**
 * An address under /diwan/events: a program's page when the slug is a
 * program's (its sessions, shifts, places and needs), an event's otherwise.
 * Programs and events never share a slug (a trigger keeps them apart).
 */
export const EventOrProgram = ({ value }: { readonly value: string }) => {
  const { supabase } = useAuth();
  const program = useQuery({
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("core")
            .from("programmes")
            .select("id")
            .eq("slug", value)
            .limit(1)
        ) ?? []
      ).length > 0,
    queryKey: ["events", "is-program", value],
  });
  if (program.isPending) {
    return <SectionSpinner />;
  }
  if (program.isError) {
    return <ErrorState onRetry={() => program.refetch()} />;
  }
  if (program.data) {
    return (
      <RequireModule module="programs">
        <ProgramPage slug={value} />
      </RequireModule>
    );
  }
  return (
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
};
