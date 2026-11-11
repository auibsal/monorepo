import { type Client, unwrap } from "./client";

/**
 * The forms signed on the site (decisions.md): one standard page,
 * `/forms/<number>` (F-06, F-10 …), with a typed-name signature; the signed
 * copy keeps the signer, the time and the form's version. The fields follow
 * the Leadership Handbook (SAL-EXB-01); labels live in the messages files
 * under `diwan.forms.defs.<key>`. Who may sign a form and who handles it is
 * `governance.form_types` (the database decides). Forms that are part of a
 * page (a role application, an audition, the Publication Agreement) stay
 * there.
 */

type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "date"
  | "datetime"
  | "number"
  | "choice"
  | "multi"
  | "check"
  | "table"
  | "grid";

export interface FormField {
  /** For `grid`: the columns. For `table`: the columns of each row. */
  readonly columns?: readonly FormField[];
  readonly key: string;
  readonly max?: number;
  readonly min?: number;
  /** For `choice` and `multi`. */
  readonly options?: readonly string[];
  readonly required?: boolean;
  /** For `grid`: the fixed rows. */
  readonly rows?: readonly string[];
  readonly type: FieldType;
}

export interface FormDefinition {
  /** May keep the signer's name sealed from the panel (F-21). */
  readonly anonymous?: boolean;
  /** Signed only through a single-use link (a parent's consent). */
  readonly byLink?: boolean;
  readonly code: string;
  readonly fields: readonly FormField[];
  readonly key: FormKey;
  /** "Office use" boxes, kept by the handlers. */
  readonly office?: readonly FormField[];
  /** Shows the printed text (a release, a declaration) above the fields. */
  readonly preamble?: boolean;
  /** Asks who the concern is about, for routing (F-20). */
  readonly routing?: boolean;
  /** Raised signed in only (a concern, decisions.md, Governance). */
  readonly signIn?: boolean;
  /** Names the person the form is about (a member). */
  readonly subject?: boolean;
}

/** The forms started from a page of their own, by number. */
const formStatuses = [
  "draft",
  "submitted",
  "acknowledged",
  "in_progress",
  "closed",
] as const;

export type FormStatus = (typeof formStatuses)[number];

export const routings = ["none", "vice_president", "president"] as const;
export type Routing = (typeof routings)[number];

export const formKeys = [
  "f06",
  "f10",
  "f11",
  "f15",
  "f17",
  "f21",
  "f26",
  "f37",
  "f38",
  "f39",
  "f45",
  "f46",
] as const;

export type FormKey = (typeof formKeys)[number];

export const forms: Record<FormKey, FormDefinition> = {
  f06: {
    code: "F-06",
    fields: [
      { key: "nothing", type: "check" },
      {
        columns: [
          { key: "what", max: 300, required: true, type: "text" },
          { key: "decisions", max: 300, required: true, type: "text" },
          { key: "handling", max: 300, required: true, type: "text" },
        ],
        key: "declarations",
        type: "table",
      },
    ],
    key: "f06",
    preamble: true,
  },
  f10: {
    code: "F-10",
    fields: [
      { key: "seconder", max: 200, required: true, type: "text" },
      { key: "title", max: 200, required: true, type: "text" },
      { key: "notes", max: 2000, required: true, type: "textarea" },
      { key: "believes", max: 2000, required: true, type: "textarea" },
      { key: "resolves", max: 2000, required: true, type: "textarea" },
      {
        key: "motion_type",
        options: ["ordinary", "amendment"],
        required: true,
        type: "choice",
      },
    ],
    key: "f10",
  },
  f11: {
    code: "F-11",
    fields: [
      { key: "title", max: 200, required: true, type: "text" },
      { key: "idea", max: 1000, required: true, type: "textarea" },
      { key: "audience", max: 300, required: true, type: "text" },
      { key: "helpers", max: 300, type: "text" },
      { key: "when", max: 200, required: true, type: "text" },
      { key: "where", max: 200, required: true, type: "text" },
      {
        key: "access",
        options: ["open", "rsvp", "private"],
        required: true,
        type: "choice",
      },
      { key: "needs", max: 2000, type: "textarea" },
      { key: "risks", max: 2000, type: "textarea" },
    ],
    key: "f11",
  },
  f15: {
    code: "F-15",
    fields: [
      { key: "occasion", max: 300, required: true, type: "text" },
      { key: "on_date", required: true, type: "date" },
      {
        key: "credit",
        options: ["name", "no_name", "photos_only"],
        required: true,
        type: "choice",
      },
      { key: "contact", max: 200, required: true, type: "text" },
      { key: "under_18", type: "check" },
    ],
    key: "f15",
    preamble: true,
  },
  f17: {
    code: "F-17",
    fields: [
      { key: "partner", max: 200, required: true, type: "text" },
      { key: "purpose", max: 1000, required: true, type: "textarea" },
      { key: "dates", max: 200, required: true, type: "text" },
      { key: "society_will", max: 2000, required: true, type: "textarea" },
      { key: "partner_will", max: 2000, required: true, type: "textarea" },
      { key: "branding", max: 1000, type: "textarea" },
      { key: "people_safety", max: 1000, required: true, type: "textarea" },
      { key: "contacts", max: 1000, required: true, type: "textarea" },
    ],
    key: "f17",
    preamble: true,
  },
  f21: {
    anonymous: true,
    code: "F-21",
    fields: [
      { key: "contact", max: 200, type: "text" },
      {
        key: "about",
        options: [
          "person",
          "event",
          "collection",
          "content",
          "decision",
          "other",
        ],
        required: true,
        type: "choice",
      },
      { key: "what", max: 4000, required: true, type: "textarea" },
      { key: "when", max: 200, type: "text" },
      { key: "wish", max: 2000, type: "textarea" },
    ],
    key: "f21",
    routing: true,
    signIn: true,
  },
  f26: {
    code: "F-26",
    fields: [
      { key: "production", max: 200, required: true, type: "text" },
      { key: "role", max: 200, required: true, type: "text" },
      { key: "no_photos", type: "check" },
      { key: "under_18", type: "check" },
    ],
    key: "f26",
    preamble: true,
  },
  f37: {
    code: "F-37",
    fields: [
      { key: "year", max: 20, required: true, type: "text" },
      {
        key: "role",
        options: ["lead", "deputy", "mentor"],
        required: true,
        type: "choice",
      },
      { key: "trained_on", required: true, type: "date" },
    ],
    key: "f37",
    preamble: true,
  },
  f38: {
    byLink: true,
    code: "F-38",
    fields: [
      { key: "student_name", max: 200, required: true, type: "text" },
      { key: "grade", max: 40, required: true, type: "text" },
      { key: "school", max: 200, required: true, type: "text" },
      { key: "relationship", max: 80, required: true, type: "text" },
      { key: "contact", max: 200, required: true, type: "text" },
      { key: "emergency_contact", max: 200, required: true, type: "text" },
      { key: "arrival", max: 1000, required: true, type: "textarea" },
      { key: "collect", max: 300, required: true, type: "text" },
      { key: "health", max: 1000, type: "textarea" },
      {
        key: "photos",
        options: ["photos", "no_photos"],
        required: true,
        type: "choice",
      },
      { key: "publishing", options: ["qirtas", "prize"], type: "multi" },
      { key: "student_agrees", required: true, type: "check" },
    ],
    key: "f38",
    preamble: true,
  },
  f39: {
    byLink: true,
    code: "F-39",
    fields: [
      { key: "piece_title", max: 200, required: true, type: "text" },
      { key: "section", max: 80, required: true, type: "text" },
      { key: "language", max: 40, required: true, type: "text" },
      { key: "student_name", max: 200, required: true, type: "text" },
      { key: "school", max: 200, required: true, type: "text" },
      { key: "student_agrees", required: true, type: "check" },
    ],
    key: "f39",
    preamble: true,
  },
  f45: {
    code: "F-45",
    fields: [
      { key: "emergency_contact", max: 200, required: true, type: "text" },
      { key: "health", max: 1000, type: "textarea" },
      { key: "agree", required: true, type: "check" },
    ],
    key: "f45",
    preamble: true,
  },
  // A parent's consent for a member under 18 (decisions §10, Minors),
  // signed only through the single-use link sent when the student's
  // account is confirmed.
  f46: {
    byLink: true,
    code: "F-46",
    fields: [
      { key: "student_name", max: 200, required: true, type: "text" },
      { key: "relationship", max: 80, required: true, type: "text" },
      {
        key: "photos",
        options: ["photos", "no_photos"],
        required: true,
        type: "choice",
      },
      { key: "consent", required: true, type: "check" },
    ],
    key: "f46",
    preamble: true,
  },
};

/**
 * What the register (SAL-EXB-01 in the Leadership Handbook, Notion) says
 * each site form asks for, in its own words: the CI check
 * (`scripts/check-forms-register.ts`) finds every phrase in the form's
 * entry, so a field changed in the register shows here before it ships.
 * Change a form's fields and these phrases together.
 */
export const registerFields: Record<FormKey, readonly string[]> = {
  f06: [
    "what it is",
    "which decisions it could affect",
    "how it will be handled",
    "nothing to declare",
  ],
  f10: [
    "proposer and seconder",
    "title",
    "this meeting notes",
    "believes",
    "resolves",
    "type: ordinary, or an amendment",
  ],
  f11: [
    "what the event is, titled plainly",
    "the idea in three sentences",
    "who it is for, and how many",
    "who will help",
    "when · where · access",
    "needs: items, quantities and dates",
    "what could go wrong, and what you would do",
  ],
  f15: [
    "event or shoot",
    "credit me by name",
    "contact",
    "under 18: a parent or guardian signs",
  ],
  f17: [
    "purpose · dates",
    "the society will · the partner will",
    "branding",
    "people and safety: the lead on the day, safeguarding, photo consent",
    "contacts",
  ],
  f21: [
    "name (optional, but without it we cannot reply) · contact",
    "about: a person, an event, a charity collection, content, a decision, other",
    "what happened, and when · what you would like to happen",
  ],
  f26: [
    "i do not want to appear in photographs or video",
    "i am under 18; my parent's or guardian's consent is attached",
  ],
  f37: ["role (qalam lead, deputy or mentor)", "date of training"],
  f38: [
    "name · grade · school",
    "relationship to the student",
    "how to reach you",
    "a second emergency contact",
    "how my child arrives and leaves",
    "who may collect my child",
    "health (optional; kept confidential)",
    "photos",
    "publishing",
    "i want to take part",
  ],
  f39: [
    "title · section of qirtas · language · the student's name · school",
    "i agree",
  ],
  f45: [
    "the trip",
    "an emergency contact (name and how to reach them)",
    "health, optional and confidential",
  ],
  f46: [
    "the student's name",
    "relationship to the student",
    "photos",
    "i consent",
  ],
};

const FORM_PREFIX = /^f-?/iu;

/** "F-06" → "f06": the address of a form is its number. */
export const keyFromNumber = (number: string) =>
  `f${number.replace(FORM_PREFIX, "").padStart(2, "0")}`.toLowerCase();

export const isFormKey = (value: string | null): value is FormKey =>
  (formKeys as readonly string[]).includes(value ?? "");

// ── Values and checks ───────────────────────────────────────────────────────

export type FormData = Record<string, unknown>;

const isBlank = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  value === false ||
  (Array.isArray(value) && value.length === 0);

const tooLong = (field: FormField, value: unknown) =>
  typeof value === "string" &&
  field.max !== undefined &&
  (field.type === "text" ||
    field.type === "textarea" ||
    field.type === "url") &&
  value.length > field.max;

const outOfRange = (field: FormField, value: unknown) => {
  if (!(field.type === "number")) {
    return false;
  }
  if (isBlank(value)) {
    return false;
  }
  const n = Number(value);
  return (
    !Number.isFinite(n) ||
    (field.min !== undefined && n < field.min) ||
    (field.max !== undefined && n > field.max)
  );
};

const URL_PATTERN = /^https?:\/\//u;

const badChoice = (field: FormField, value: unknown) => {
  if (isBlank(value)) {
    return false;
  }
  if (field.type === "choice") {
    return !field.options?.includes(String(value));
  }
  if (field.type === "multi") {
    return (
      !Array.isArray(value) ||
      value.some((v) => !field.options?.includes(String(v)))
    );
  }
  if (field.type === "url") {
    return !URL_PATTERN.test(String(value));
  }
  return false;
};

const rowProblems = (field: FormField, value: unknown) => {
  if (field.type !== "table" || !Array.isArray(value)) {
    return false;
  }
  if (field.max !== undefined && value.length > field.max) {
    return true;
  }
  return value.some((row) => {
    const cells = (row ?? {}) as FormData;
    return (field.columns ?? []).some(
      (col) =>
        (col.required && isBlank(cells[col.key])) ||
        outOfRange(col, cells[col.key])
    );
  });
};

/** The keys of fields that are missing or invalid (empty when it's fine). */
export const formProblems = (
  definition: FormDefinition,
  data: FormData
): string[] =>
  definition.fields
    .filter((field) => {
      const value = data[field.key];
      return (
        (field.required && isBlank(value)) ||
        tooLong(field, value) ||
        outOfRange(field, value) ||
        badChoice(field, value) ||
        rowProblems(field, value)
      );
    })
    .map((field) => field.key);

// ── Reads and writes ────────────────────────────────────────────────────────

export interface SignInput {
  anonymous?: boolean;
  data: FormData;
  /** "I agree" to sign electronically (E-SIGN, UETA). */
  esignAgreed: boolean;
  form: FormKey;
  routing?: Routing;
  /** The signer's contact, for a signer without an account (a parent, a guest). */
  signerContact?: string | null;
  /** The typed name: the e-signature. */
  signerName: string;
  subjectId?: string | null;
}

/** Signs and sends a form in the signed-in member's name; the signed copy
 * keeps the signer, the time, the version and the fingerprint. Signing
 * without an account, or anonymously, goes through /api/forms/sign. */
export const signForm = async (client: Client, input: SignInput) =>
  unwrap(
    await client.schema("governance").rpc("sign_form", {
      anonymous: input.anonymous ?? false,
      data: input.data as never,
      esign_agreed: input.esignAgreed,
      form_key: input.form,
      routing: input.routing ?? "none",
      signer_contact: input.signerContact ?? undefined,
      signer_name: input.signerName,
      subject_id: input.subjectId ?? undefined,
    })
  ) as string;

export const handleForm = async (
  client: Client,
  id: string,
  status: Exclude<FormStatus, "draft" | "submitted">,
  office?: FormData
) =>
  unwrap(
    await client.schema("governance").rpc("handle_form", {
      office: (office ?? undefined) as never,
      status,
      submission_id: id,
    })
  );

/**
 * The register's numbers (decisions.md, Forms): F-01 to F-46, with retired
 * numbers never reused or shifted, so a signed record always points to its
 * form. The register shows the active forms with their count.
 */
export const retiredForms = ["F-08", "F-22", "F-31", "F-44"] as const;
const LAST_FORM = 46;
export const activeFormCount = LAST_FORM - retiredForms.length;

export const formTypes = async (client: Client) =>
  unwrap(
    await client
      .schema("governance")
      .from("form_types")
      .select("*")
      .order("sort")
  ) ?? [];

export const formQueue = async (client: Client) =>
  unwrap(await client.schema("governance").rpc("form_queue")) ?? [];
