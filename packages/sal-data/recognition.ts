import { z } from "zod";
import { type Client, unwrap } from "./client";

/**
 * Recognition: staff service (hours for service letters, staff only) and
 * certificates, only for finishing Qalam and for the Mutanabbi Prize
 * (owner, Nov 7, 2026). Row Level Security and the RPCs decide who may
 * confirm, sign and revoke.
 */

export const certificateKinds = ["qalam", "prize"] as const;

export type CertificateKind = (typeof certificateKinds)[number];

/** The academic year runs from September 1. */
export const academicYearStart = (on: Date = new Date()) => {
  const year =
    on.getUTCMonth() >= 8 ? on.getUTCFullYear() : on.getUTCFullYear() - 1;
  return `${year}-09-01`;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .transform((value) => value || null)
  .nullable()
  .optional();

/** One line of the Volunteer Hours Log (F-16). */
export const serviceEntrySchema = z.object({
  activity: z.string().trim().min(1).max(200),
  hours: z
    .number()
    .positive()
    .max(24)
    .refine((h) => Number.isInteger(h * 4), { message: "quarter_hours" }),
  occurred_on: z.iso.date(),
  programme_id: z.uuid().nullable().optional(),
  what: optionalText(1000),
});

export type ServiceEntryInput = z.input<typeof serviceEntrySchema>;

/**
 * A certificate: the Mutanabbi Prize's names a member and carries its
 * citation; Qalam's names a student (no account), from the roster.
 */
export const certificateSchema = z
  .object({
    citation_ar: optionalText(500),
    citation_en: optionalText(500),
    kind: z.enum(certificateKinds),
    period_from: optionalDate,
    period_to: optionalDate,
    qalam_student_id: z.uuid().nullable().optional(),
    recipient_name: optionalText(200),
    user_id: z.uuid().nullable().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.kind === "prize" && !(c.user_id && c.citation_en)) {
      ctx.addIssue({
        code: "custom",
        message: "member_and_citation",
        path: ["citation_en"],
      });
    }
    if (c.kind === "qalam" && !(c.qalam_student_id || c.recipient_name)) {
      ctx.addIssue({
        code: "custom",
        message: "student",
        path: ["recipient_name"],
      });
    }
    if (c.period_from && c.period_to && c.period_to < c.period_from) {
      ctx.addIssue({
        code: "custom",
        message: "ends_before_start",
        path: ["period_to"],
      });
    }
  });

export type CertificateInput = z.input<typeof certificateSchema>;

const TRAILING_SLASH = /\/$/;

/**
 * Where a certificate is checked, from the verify page's path in the
 * reader's language: auibsal.org/verify/<code>, auibsal.org/ar/verify/<code>.
 */
export const verificationUrl = (
  webHost: string,
  verifyPath: string,
  code: string
) => `${webHost.replace(TRAILING_SLASH, "")}${verifyPath}/${code}`;

/**
 * LinkedIn's "Add to profile" link for a certification. Opens LinkedIn with
 * the fields filled in; nothing is sent until the member saves it.
 */
export const linkedInUrl = (input: {
  issuedAt: string;
  name: string;
  serial: string;
  url: string;
}) => {
  const issued = new Date(input.issuedAt);
  const params = new URLSearchParams({
    certId: input.serial,
    certUrl: input.url,
    issueMonth: String(issued.getUTCMonth() + 1),
    issueYear: String(issued.getUTCFullYear()),
    name: input.name,
    organizationName: "AUIB Society of Arts and Letters",
    startTask: "CERTIFICATION_NAME",
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
};

// ── Members ─────────────────────────────────────────────────────────────────

export const myService = async (client: Client) =>
  unwrap(
    await client
      .schema("membership")
      .from("service_records")
      .select(
        "id, source, programme_id, occurred_on, activity, what, hours, status, reject_reason, confirmed_at"
      )
      .eq("user_id", (await client.auth.getUser()).data.user?.id ?? "")
      .order("occurred_on", { ascending: false })
  ) ?? [];

export const logHours = async (client: Client, input: ServiceEntryInput) => {
  const entry = serviceEntrySchema.parse(input);
  return unwrap(
    await client
      .schema("membership")
      .from("service_records")
      .insert({
        activity: entry.activity,
        hours: entry.hours,
        occurred_on: entry.occurred_on,
        programme_id: entry.programme_id ?? null,
        what: entry.what ?? null,
      })
  );
};

/** Confirmed hours this academic year (the caller's own by default). */
export const serviceHours = async (client: Client, userId?: string) =>
  Number(
    unwrap(
      await client
        .schema("membership")
        .rpc("service_hours", userId ? { uid: userId } : {})
    ) ?? 0
  );

export const myCertificates = async (client: Client) =>
  unwrap(
    await client
      .schema("membership")
      .from("certificates")
      .select("*")
      .eq("user_id", (await client.auth.getUser()).data.user?.id ?? "")
      .neq("status", "draft")
      .order("issued_at", { ascending: false })
  ) ?? [];

export const certificateSigners = async (
  client: Client,
  certificateId: string
) =>
  unwrap(
    await client
      .schema("membership")
      .rpc("certificate_signers", { certificate_id: certificateId })
  )?.[0] ?? null;

// ── Officers ────────────────────────────────────────────────────────────────

export const confirmService = async (
  client: Client,
  recordId: string,
  approve: boolean,
  reason?: string
) =>
  unwrap(
    await client.schema("membership").rpc("confirm_service", {
      approve,
      reason: reason ?? undefined,
      record_id: recordId,
    })
  );

export const recordEventService = async (
  client: Client,
  eventId: string,
  memberId: string,
  hours: number
) =>
  unwrap(
    await client.schema("membership").rpc("record_event_service", {
      event_id: eventId,
      hours,
      member_id: memberId,
    })
  );

export const serviceTotals = async (client: Client) =>
  unwrap(await client.schema("membership").rpc("service_totals")) ?? [];

/** Signs or countersigns; returns "issued" once both have signed. */
export const signCertificate = async (client: Client, certificateId: string) =>
  unwrap(
    await client
      .schema("membership")
      .rpc("sign_certificate", { certificate_id: certificateId })
  ) as "signed" | "issued";

export const revokeCertificate = async (
  client: Client,
  certificateId: string,
  reason: string
) =>
  unwrap(
    await client.schema("membership").rpc("revoke_certificate", {
      certificate_id: certificateId,
      reason,
    })
  );

// ── Public ──────────────────────────────────────────────────────────────────

export const verifyCertificate = async (client: Client, code: string) =>
  unwrap(
    await client.schema("membership").rpc("verify_certificate", { code })
  )?.[0] ?? null;

// ── A member's year (the design review C23) ─────────────────────────────────

/**
 * The academic year Y runs from September 1, Y, to August 31, Y + 1
 * (`academicYearStart`, as service hours count it); "2026" is 2026–27.
 */
export const societyYear = (year: number) => ({
  from: `${year}-09-01T00:00:00+03:00`,
  to: `${year + 1}-09-01T00:00:00+03:00`,
});

/** The academic year a date falls in. */
export const societyYearOf = (date: Date = new Date()) =>
  Number(academicYearStart(date).slice(0, 4));

/**
 * One member's year, from their own records only (each read under Row
 * Level Security as themselves): the events they came to, the roles they
 * held, the service confirmed, the work they sent and what was accepted,
 * and the certificates issued. Private; nobody else reads it.
 */
export const myYear = async (client: Client, userId: string, year: number) => {
  const { from, to } = societyYear(year);
  const fromDay = from.slice(0, 10);
  const toDay = to.slice(0, 10);
  const [checkIns, roles, service, submissions, certificates] =
    await Promise.all([
      client
        .schema("events")
        .from("check_ins")
        .select(
          "id, checked_in_at, event:events(slug, title_en, title_ar, starts_at)"
        )
        .eq("user_id", userId)
        .gte("checked_in_at", from)
        .lt("checked_in_at", to)
        .order("checked_in_at"),
      client
        .schema("access")
        .from("role_assignments")
        .select(
          "id, role, title_en, title_ar, starts_at, ends_at, roles(name_en, name_ar)"
        )
        .eq("user_id", userId)
        .lt("starts_at", to)
        .or(`ends_at.is.null,ends_at.gte.${from}`)
        .order("starts_at"),
      client
        .schema("membership")
        .from("service_records")
        .select("id, occurred_on, activity, hours")
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .gte("occurred_on", fromDay)
        .lt("occurred_on", toDay)
        .order("occurred_on"),
      client
        .schema("journal")
        .from("submissions")
        .select("id, title, status, created_at")
        .gte("created_at", from)
        .lt("created_at", to)
        .neq("status", "withdrawn")
        .order("created_at"),
      client
        .schema("membership")
        .from("certificates")
        .select("id, kind, serial, issued_at")
        .eq("user_id", userId)
        .eq("status", "issued")
        .gte("issued_at", from)
        .lt("issued_at", to)
        .order("issued_at"),
    ]);
  const service_ = unwrap(service) ?? [];
  return {
    certificates: unwrap(certificates) ?? [],
    events: unwrap(checkIns) ?? [],
    hours: service_.reduce((sum, r) => sum + Number(r.hours), 0),
    roles: unwrap(roles) ?? [],
    service: service_,
    submissions: unwrap(submissions) ?? [],
  };
};
