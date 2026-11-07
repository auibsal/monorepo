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

/** The Prize's two categories (owner, Nov 7, 2026). */
export const prizeCategories = ["qirtas", "qalam"] as const;

/** A certificate's one language, the one its recipient chose. */
export const certificateLanguages = ["en", "ar"] as const;

type Lang = (typeof certificateLanguages)[number];

/**
 * A certificate's words, in its own language (owner, Nov 7, 2026: one
 * language per certificate, the one its recipient chose, whatever the
 * page's). The lead line is "This certifies that" («تشهد الجمعية بأن»), the
 * date line "Given on April 27, 2028" («مُنحت في 27 نيسان 2028»).
 */
export const certificateCopy: Record<
  Lang,
  {
    body: (input: {
      category: string;
      citation: string;
      kind: CertificateKind;
    }) => string;
    categories: Record<(typeof prizeCategories)[number], string>;
    codes: Record<CertificateKind, string>;
    given: (date: string) => string;
    lead: string;
    revoked: string;
    roles: Record<"eic" | "president" | "qalam_lead", string>;
    society: string;
    titles: Record<CertificateKind, string>;
  }
> = {
  ar: {
    body: ({ category, citation, kind }) =>
      kind === "qalam"
        ? "أتمّ «قلم»، البرنامج الصيفي لقرطاس، صحيفة جمعية الفنون والآداب في الجامعة الأمريكية في العراق – بغداد."
        : `${citation}، في فئة «${category}» من جائزة المتنبي التي تمنحها جمعية الفنون والآداب في الجامعة الأمريكية في العراق – بغداد.`,
    categories: { qalam: "قلم", qirtas: "قرطاس" },
    codes: { prize: "SAL-EDT · جائزة المتنبي", qalam: "SAL-EDT · قلم" },
    given: (date) => `مُنحت في ${date}`,
    lead: "تشهد الجمعية بأن",
    revoked: "أُلغيت هذه الشهادة.",
    roles: {
      eic: "رئيس التحرير",
      president: "الرئيس",
      qalam_lead: "مسؤول «قلم»",
    },
    society: "جمعية الفنون والآداب",
    titles: { prize: "جائزة المتنبي", qalam: "شهادة إتمام «قلم»" },
  },
  en: {
    body: ({ category, citation, kind }) =>
      kind === "qalam"
        ? "completed Qalam, the summer program of Qirtas, the paper of the AUIB Society of Arts and Letters."
        : `${citation}, in the ${category} category of the Mutanabbi Prize of the AUIB Society of Arts and Letters.`,
    categories: { qalam: "Qalam", qirtas: "Qirtas" },
    codes: { prize: "SAL-EDT · Mutanabbi Prize", qalam: "SAL-EDT · Qalam" },
    given: (date) => `Given on ${date}`,
    lead: "This certifies that",
    revoked: "This certificate has been revoked.",
    roles: {
      eic: "Editor-in-Chief",
      president: "President",
      qalam_lead: "Qalam lead",
    },
    society: "SOCIETY OF ARTS AND LETTERS",
    titles: {
      prize: "The Mutanabbi Prize",
      qalam: "Certificate of completion, Qalam",
    },
  },
};

/**
 * A service letter's words (SAL-EXB-01 · F-05; owner, Nov 7, 2026), in the
 * letter's own language: an American business letter, "To whom it may
 * concern:", signed by the Director of Membership.
 */
export const serviceLetterCopy: Record<
  Lang,
  {
    body: (input: {
      from: string;
      hours: string | null;
      name: string;
      role: string;
      to: string | null;
    }) => string;
    code: string;
    foot: string;
    greeting: string;
    qr: string;
    signerRole: string;
    /** The seat for a signer who chose the feminine form (decisions §13). */
    signerRoleFeminine: string;
    subject: string;
  }
> = {
  ar: {
    body: ({ from, hours, name, role, to }) =>
      `خدم ${name} جمعية الفنون والآداب في الجامعة الأمريكية في العراق – بغداد بصفة ${role}، ${to ? `من ${from} إلى ${to}` : `منذ ${from}`}${hours ? `، وقدّم ${hours} ساعة من الخدمة المؤكدة` : ""}.`,
    code: "SAL-EXB-01 · F-05",
    foot: "hello@auibsal.org · auibsal.org",
    greeting: "إلى من يهمه الأمر،",
    qr: "امسح الرمز للتحقق من هذه الرسالة",
    signerRole: "مدير العضوية",
    signerRoleFeminine: "مديرة العضوية",
    subject: "رسالة خدمة",
  },
  en: {
    body: ({ from, hours, name, role, to }) =>
      `${name} served the AUIB Society of Arts and Letters as ${role}, ${to ? `from ${from} to ${to}` : `since ${from}`}${hours ? `, giving ${hours} confirmed hours of service` : ""}.`,
    code: "SAL-EXB-01 · F-05",
    foot: "hello@auibsal.org · auibsal.org",
    greeting: "To whom it may concern:",
    qr: "Scan to check this letter",
    signerRole: "Director of Membership",
    signerRoleFeminine: "Director of Membership",
    subject: "Service letter",
  },
};

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
 * A certificate: the Mutanabbi Prize's names a member and a category and
 * carries its citation; Qalam's names a student on the roster (no account),
 * whose full name appears only on the certificate.
 */
export const certificateSchema = z
  .object({
    citation_ar: optionalText(500),
    citation_en: optionalText(500),
    kind: z.enum(certificateKinds),
    lang: z.enum(certificateLanguages),
    prize_category: z.enum(prizeCategories).nullable().optional(),
    qalam_student_id: z.uuid().nullable().optional(),
    user_id: z.uuid().nullable().optional(),
  })
  .superRefine((c, ctx) => {
    if (
      c.kind === "prize" &&
      !(c.user_id && c.prize_category && (c.citation_en || c.citation_ar))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "member_category_and_citation",
        path: ["citation_en"],
      });
    }
    if (c.kind === "qalam" && !c.qalam_student_id) {
      ctx.addIssue({
        code: "custom",
        message: "student",
        path: ["qalam_student_id"],
      });
    }
  });

/**
 * Who signs each certificate, in order (owner, Nov 7, 2026): Qalam, the
 * Qalam lead and the Editor-in-Chief; the Prize, the Editor-in-Chief and
 * the President. The database checks the same (`sign_certificate`).
 */
export const certificateSigners = {
  prize: ["eic", "president"],
  qalam: ["qalam_lead", "eic"],
} as const satisfies Record<CertificateKind, readonly [string, string]>;

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

export const certificateSignerNames = async (
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

/** A service letter's check (F-05): who, for what, when, and whether it stands. */
export const verifyServiceLetter = async (client: Client, code: string) =>
  unwrap(
    await client.schema("membership").rpc("verify_service_letter", { code })
  )?.[0] ?? null;

// ── Service letters (F-05) ──────────────────────────────────────────────────

/** A service letter, written by the Director of Membership on request. */
export const serviceLetterSchema = z.object({
  body: optionalText(3000),
  hours: z.number().min(0).max(9999).nullable().optional(),
  lang: z.enum(certificateLanguages),
  period_from: z.iso.date(),
  period_to: optionalDate,
  role_ar: optionalText(200),
  role_en: z.string().trim().min(1).max(200),
  user_id: z.uuid(),
});

export type ServiceLetterInput = z.input<typeof serviceLetterSchema>;

export const issueServiceLetter = async (
  client: Client,
  input: ServiceLetterInput
) => {
  const letter = serviceLetterSchema.parse(input);
  return unwrap(
    await client
      .schema("membership")
      .from("service_letters")
      .insert({
        body: letter.body ?? null,
        hours: letter.hours ?? null,
        lang: letter.lang,
        period_from: letter.period_from,
        period_to: letter.period_to ?? null,
        role_ar: letter.role_ar ?? null,
        role_en: letter.role_en,
        user_id: letter.user_id,
      })
      .select("id")
      .single()
  );
};

/** The letters the reader may see: their own, or all for the Director. */
export const serviceLetters = async (client: Client, userId?: string) => {
  let query = client
    .schema("membership")
    .from("service_letters")
    .select("*")
    .order("issued_at", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  return unwrap(await query) ?? [];
};

export const serviceLetter = async (client: Client, id: string) =>
  unwrap(
    await client
      .schema("membership")
      .from("service_letters")
      .select("*")
      .eq("id", id)
      .maybeSingle()
  );

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
