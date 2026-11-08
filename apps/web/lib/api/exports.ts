import "server-only";

import type { Permission } from "@repo/rbac";
import { membership, unwrap } from "@repo/sal-data";
import { z } from "zod";
import type { ApiSession } from "./permissions";

/**
 * CSV exports for the Diwan admin. Each one runs as the caller (their JWT),
 * so Row Level Security and the SQL functions decide the rows; the
 * permission here is re-checked first, in any scope.
 */
interface ExportTable {
  header: string[];
  rows: unknown[][];
}

export interface ExportDefinition {
  readonly permissions: readonly Permission[];
  readonly run: (
    session: ApiSession,
    params: Record<string, string>
  ) => Promise<ExportTable>;
}

const uuid = z.uuid();

/** Attendance for one event: RSVPs, answers and check-ins (RLS decides). */
const attendanceRows = async (
  session: ApiSession,
  params: Record<string, string>
) => {
  const eventId = uuid.parse(params.event_id);
  const db = session.supabase;
  const event = unwrap(
    await db
      .schema("events")
      .from("events")
      .select("questions")
      .eq("id", eventId)
      .maybeSingle()
  );
  if (!event) {
    throw new Error("Event not found or not visible to the caller");
  }
  const questions = (event.questions ?? []) as {
    id: string;
    label_en: string;
  }[];
  const [rsvps, checkIns] = await Promise.all([
    db
      .schema("events")
      .from("rsvps")
      .select("user_id, answers, created_at, from_waitlist")
      .eq("event_id", eventId)
      .eq("status", "confirmed")
      .order("created_at"),
    db
      .schema("events")
      .from("check_ins")
      .select("user_id, method, checked_in_at")
      .eq("event_id", eventId),
  ]);
  const rsvpRows = unwrap(rsvps) ?? [];
  const checkInRows = unwrap(checkIns) ?? [];
  const ids = [...new Set([...rsvpRows, ...checkInRows].map((r) => r.user_id))];
  const profiles = ids.length
    ? (unwrap(
        await db
          .schema("core")
          .from("profiles")
          .select("id, full_name_en, full_name_ar")
          .in("id", ids)
      ) ?? [])
    : [];

  const rows = ids.map((id) => {
    const profile = profiles.find((p) => p.id === id);
    const rsvp = rsvpRows.find((r) => r.user_id === id);
    const checkIn = checkInRows.find((c) => c.user_id === id);
    const answers = (rsvp?.answers ?? {}) as Record<string, string>;
    return [
      profile?.full_name_en ?? "",
      profile?.full_name_ar ?? "",
      rsvp ? rsvp.created_at : "",
      rsvp?.from_waitlist ? "yes" : "no",
      checkIn ? checkIn.checked_in_at : "",
      checkIn?.method ?? "",
      ...questions.map((q) => answers[q.id] ?? ""),
    ];
  });
  return {
    header: [
      "name_en",
      "name_ar",
      "rsvp_at",
      "from_waitlist",
      "checked_in_at",
      "check_in_method",
      ...questions.map((q) => q.label_en),
    ],
    rows,
  };
};

/** The requests to Student Life: every needs list (RLS: governance). */
const needsRows = async (session: ApiSession): Promise<ExportTable> => {
  const [rows, programs] = await Promise.all([
    session.supabase
      .schema("programmes")
      .from("needs")
      .select(
        "programme_id, item, quantity, needed_by, purpose, status, requested_on, provided_on, provided_note"
      )
      .order("needed_by"),
    session.supabase.schema("core").from("programmes").select("id, name_en"),
  ]);
  const names = new Map((unwrap(programs) ?? []).map((p) => [p.id, p.name_en]));
  return {
    header: [
      "program",
      "item",
      "quantity",
      "needed_by",
      "purpose",
      "status",
      "requested_on",
      "provided_on",
      "provided_note",
    ],
    rows: (unwrap(rows) ?? []).map((r) => [
      (r.programme_id ? names.get(r.programme_id) : undefined) ?? "",
      r.item,
      r.quantity,
      r.needed_by,
      r.purpose,
      r.status,
      r.requested_on,
      r.provided_on,
      r.provided_note,
    ]),
  };
};

/** core.member_details, in the order the members export lists them. */
const detailColumns = [
  "affiliation",
  "college",
  "major",
  "study_level",
  "graduation_year",
  "birth_year",
  "gender",
  "city",
  "languages",
  "interests",
  "skills",
  "volunteer",
  "heard_from",
  "research_consent",
] as const;

const studentLifeTable = (
  rows: {
    email: string;
    full_name_ar: string | null;
    full_name_en: string;
    seat_ar: string | null;
    seat_en: string;
  }[]
): ExportTable => ({
  header: ["name_en", "name_ar", "auib_email", "seat_en", "seat_ar"],
  rows: rows.map((r) => [
    r.full_name_en,
    r.full_name_ar,
    r.email,
    r.seat_en,
    r.seat_ar,
  ]),
});

export const exportsByName: Record<string, ExportDefinition> = {
  attendance: {
    permissions: ["events.manage", "events.checkin"],
    run: attendanceRows,
  },
  members: {
    permissions: ["members.register"],
    run: async (session) => {
      // What members told us about themselves: RLS returns these rows to
      // members.manage only; for anyone else the columns stay empty.
      const details = new Map(
        (
          unwrap(
            await session.supabase
              .schema("core")
              .from("member_details")
              .select("*")
          ) ?? []
        ).map((d) => [d.user_id, d as Record<string, unknown>])
      );
      const cell = (value: unknown) =>
        Array.isArray(value) ? value.join(" ") : (value ?? "");
      return {
        header: [
          "name_en",
          "name_ar",
          "email",
          "tier",
          "member_since",
          "verified",
          "activities_this_and_last_semester",
          "voting_member",
          ...detailColumns,
        ],
        rows: (await membership.register(session.supabase)).map((m) => {
          const own = details.get(m.user_id);
          return [
            m.full_name_en,
            m.full_name_ar,
            m.email,
            m.tier,
            m.member_since,
            m.verified_at ? "yes" : "no",
            m.activities,
            m.voting_member ? "yes" : "no",
            ...detailColumns.map((column) => cell(own?.[column])),
          ];
        }),
      };
    },
  },
  needs: {
    permissions: ["governance.manage"],
    run: needsRows,
  },
  // For Student Life's GPA check (decisions §4): an election's candidates,
  // and every Council seat each term. Name, AUIB address and seat only.
  "student-life-candidates": {
    permissions: ["elections.manage"],
    run: async (session, params) =>
      studentLifeTable(
        unwrap(
          await session.supabase.schema("governance").rpc("student_life_list", {
            election_id: uuid.parse(params.election_id),
          })
        ) ?? []
      ),
  },
  "student-life-council": {
    permissions: ["governance.manage"],
    run: async (session) =>
      studentLifeTable(
        unwrap(
          await session.supabase.schema("governance").rpc("student_life_list")
        ) ?? []
      ),
  },
};
