import { Constants, type Enums } from "@repo/database";
import { z } from "zod";
import { type Client, unwrap } from "./client";
import { sanitizeRichText, toPlainText } from "./sanitize";

export type Category = Enums<{ schema: "journal" }, "category">;

/** Qirtas's six sections (journal.desk). */
export const desks = [
  "news",
  "voices",
  "letters",
  "gallery",
  "video",
  "games",
] as const satisfies readonly Enums<{ schema: "journal" }, "desk">[];
export type Desk = Enums<{ schema: "journal" }, "desk">;

/**
 * Six types a section (owner, Oct 29, 2026), in the order the forms list
 * them: the same mapping as journal.desk_of(). The enum keeps retired
 * labels (prose); journal.is_current_category() refuses them.
 */
export const sectionTypes = {
  gallery: [
    "art",
    "photography",
    "illustration",
    "comic",
    "calligraphy",
    "photo_essay",
  ],
  games: [
    "crossword",
    "quiz",
    "word_ladder",
    "riddle",
    "anagram",
    "name_the_book",
  ],
  letters: [
    "poetry",
    "fiction",
    "creative_nonfiction",
    "drama",
    "translation",
    "six_words",
  ],
  news: [
    "report",
    "feature",
    "interview",
    "profile",
    "event_coverage",
    "explainer",
  ],
  video: [
    "next_stop_episode",
    "reel",
    "short_film",
    "video_report",
    "recorded_performance",
    "animation",
  ],
  voices: [
    "review",
    "column",
    "opinion_essay",
    "letter_to_editor",
    "debate",
    "recommendations",
  ],
} as const satisfies Record<Desk, readonly Category[]>;

/** Every current type of piece, section by section. */
export const categories: readonly Category[] = desks.flatMap(
  (d) => sectionTypes[d]
);

/** The section each type belongs to: the same mapping as journal.desk_of(). */
export const deskOf = (category: Category): Desk =>
  desks.find((d) =>
    (sectionTypes[d] as readonly Category[]).includes(category)
  ) ?? "letters";

/** Letters and Gallery answer a call for an Edition and are read blind. */
export const isEditionDesk = (desk: Desk) =>
  desk === "letters" || desk === "gallery";

/** The types in each section, in the order the forms list them. */
export const deskCategories = (desk: Desk): readonly Category[] =>
  sectionTypes[desk];

/**
 * Types that take no submissions: Six Words come only from the Typewriter
 * Tour. The database refuses them too.
 */
export const closedCategories: readonly Category[] = ["six_words"];

/** The types a member sends in each section. */
export const sendableCategories = (desk: Desk) =>
  deskCategories(desk).filter((c) => !closedCategories.includes(c));

/**
 * The newsroom (always open: News, Voices, Video, Games) and the Edition
 * (Letters and Gallery, open only during a call).
 */
export const newsroomDesks = desks.filter((d) => !isEditionDesk(d));
export const editionDesks = desks.filter((d) => isEditionDesk(d));

export const submissionStatuses = Constants.journal.Enums.submission_status;
export type SubmissionStatus = Enums<
  { schema: "journal" },
  "submission_status"
>;

/** Board columns, in order (Accepted, Declined and Withdrawn share the last). */
export const boardColumns = [
  "received",
  "intake_check",
  "in_review",
  "third_read",
  "selection",
] as const satisfies readonly SubmissionStatus[];

export const finalStatuses = [
  "accepted",
  "declined",
  "withdrawn",
] as const satisfies readonly SubmissionStatus[];

/**
 * Rubric v2. Each criterion 1–5, weighted to a total out of 100 — the same
 * limits and weights as journal.scores (check constraints and the generated
 * `total` column).
 */
export const rubric = {
  archive_factor: { max: 5, min: 1, weight: 20 },
  craft: { max: 5, min: 1, weight: 30 },
  depth: { max: 5, min: 1, weight: 25 },
  voice: { max: 5, min: 1, weight: 25 },
} as const;

export type Criterion = keyof typeof rubric;
export const criteria = [
  "craft",
  "voice",
  "depth",
  "archive_factor",
] as const satisfies readonly Criterion[];

const criterion = (key: Criterion) =>
  z.number().int().min(rubric[key].min).max(rubric[key].max);

export const scoreSchema = z.object({
  archive_factor: criterion("archive_factor"),
  comment: z.string().max(4000).optional(),
  craft: criterion("craft"),
  depth: criterion("depth"),
  voice: criterion("voice"),
});

export type ScoreInput = z.infer<typeof scoreSchema>;

/** Same formula as the database: score × weight ÷ 5. */
export const rubricTotal = (score: Pick<ScoreInput, Criterion>) =>
  criteria.reduce(
    (sum, key) => sum + (score[key] * rubric[key].weight) / rubric[key].max,
    0
  );

/** Third read when the two blind reads differ by more than this. */
export const THIRD_READ_SPREAD = 20;

export const needsThirdRead = (first: number, second: number) =>
  Math.abs(first - second) > THIRD_READ_SPREAD;

export type Band = "strong" | "consider" | "decline";

/** Bands: 80+ strong, 65–79 consider, below 65 decline. */
export const band = (total: number): Band => {
  if (total >= 80) {
    return "strong";
  }
  return total >= 65 ? "consider" : "decline";
};

/**
 * The moves editors make on the board, mirroring private.allowed_transition
 * for journal.manage / journal.decide (intake belongs to the Submissions
 * Manager; accepting and declining go through journal.decide).
 */
export const editorMoves: Partial<
  Record<SubmissionStatus, readonly SubmissionStatus[]>
> = {
  in_review: ["third_read", "selection"],
  selection: ["in_review"],
  third_read: ["selection"],
};

export const canEditorMove = (from: SubmissionStatus, to: SubmissionStatus) =>
  editorMoves[from]?.includes(to) ?? false;

/** Mean of the submitted read totals (rounded to one place), or null. */
export const averageTotal = (
  totals: readonly (number | null | undefined)[]
) => {
  const scored = totals.filter(
    (total): total is number => typeof total === "number"
  );
  if (scored.length === 0) {
    return null;
  }
  const mean = scored.reduce((sum, total) => sum + total, 0) / scored.length;
  return Math.round(mean * 10) / 10;
};

export const MAX_SUBMISSIONS_PER_CALL = 2;
export const MAX_SUBMISSIONS_PER_HOUR = 3;

export const submissionFileTypes = {
  image: ["image/jpeg", "image/png"],
  manuscript: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
} as const;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const submissionSchema = z
  .object({
    body_html: z.string().max(200_000).optional(),
    /** Edition sections only (Letters, Gallery); the newsroom has none. */
    call_id: z.uuid().optional(),
    category: z.enum(categories as [Category, ...Category[]]),
    /** Every identifiable person in an image consented (Gallery: required). */
    consent_confirmed: z.boolean().optional(),
    cover_note: z.string().max(2000).optional(),
    /** News: one or two sentences under the headline. */
    deck: z.string().trim().max(400).optional(),
    /** The work has not appeared in another journal, anthology or book. */
    first_publication_confirmed: z.boolean().optional(),
    human_authorship_confirmed: z.literal(true),
    language: z.enum(Constants.journal.Enums.language),
    /** The partner the author submits through (partner pathway). */
    partner_id: z.uuid().optional(),
    /** Only the Submissions Manager keeps the real name. */
    pen_name: z.string().trim().min(2).max(80).optional(),
    rights_note: z.string().max(2000).optional(),
    source_author: z.string().max(300).optional(),
    source_text: z.string().max(200_000).optional(),
    title: z.string().trim().min(1).max(300),
    video_url: z
      .url({ protocol: /^https$/ })
      .max(500)
      .optional(),
  })
  .superRefine((value, context) => {
    const desk = deskOf(value.category);
    if (isEditionDesk(desk) !== Boolean(value.call_id)) {
      context.addIssue({
        code: "custom",
        message: isEditionDesk(desk) ? "call_required" : "no_call",
        path: ["call_id"],
      });
    }
    if (desk !== "news" && value.first_publication_confirmed !== true) {
      context.addIssue({
        code: "custom",
        message: "first_publication_required",
        path: ["first_publication_confirmed"],
      });
    }
    if (desk === "gallery" && value.consent_confirmed !== true) {
      context.addIssue({
        code: "custom",
        message: "consent_required",
        path: ["consent_confirmed"],
      });
    }
    if (desk === "video" && !value.video_url) {
      context.addIssue({
        code: "custom",
        message: "video_required",
        path: ["video_url"],
      });
    }
    if (value.category === "translation") {
      if (!value.source_text?.trim()) {
        context.addIssue({
          code: "custom",
          message: "source_required",
          path: ["source_text"],
        });
      }
      if (!value.rights_note?.trim()) {
        context.addIssue({
          code: "custom",
          message: "rights_required",
          path: ["rights_note"],
        });
      }
    }
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;

/** A random object name for the private bucket: <submission id>/<random>.<ext>. */
export const submissionObjectPath = (
  submissionId: string,
  mimeType: string
) => {
  const ext =
    {
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "image/jpeg": "jpg",
      "image/png": "png",
    }[mimeType] ?? "bin";
  return `${submissionId}/${crypto.randomUUID()}.${ext}`;
};

// ── Queries ─────────────────────────────────────────────────────────────────

const journal = (client: Client) => client.schema("journal");

export const createSubmission = async (
  client: Client,
  input: SubmissionInput
) =>
  unwrap(
    await journal(client)
      .from("submissions")
      .insert({
        ...input,
        body_html: input.body_html ? sanitizeRichText(input.body_html) : null,
      })
      .select("id")
      .single()
  );

export const mySubmissions = async (client: Client) =>
  unwrap(
    await journal(client)
      .from("submissions")
      .select(
        "id, title, category, status, created_at, call_id, intake_note, intake_returned_at"
      )
      .order("created_at", { ascending: false })
  );

export const openCalls = async (client: Client, now = new Date()) =>
  unwrap(
    await journal(client)
      .from("calls")
      .select("*")
      .lte("opens_at", now.toISOString())
      .gte("closes_at", now.toISOString())
      .order("closes_at")
  );

/** The next published call that has not opened yet, if any. */
export const nextCall = async (client: Client, now = new Date()) =>
  unwrap(
    await journal(client)
      .from("calls")
      .select("id, title_en, title_ar, opens_at, closes_at")
      .eq("is_published", true)
      .gt("opens_at", now.toISOString())
      .order("opens_at")
      .limit(1)
      .maybeSingle()
  );

/** Whether the member asked to hear when a call opens. */
export const hasCallAlert = async (client: Client) =>
  (unwrap(
    await journal(client).from("call_alerts").select("user_id").maybeSingle()
  ) ?? null) !== null;

export const setCallAlert = async (client: Client, on: boolean) =>
  on
    ? unwrap(
        await journal(client)
          .from("call_alerts")
          .upsert({}, { ignoreDuplicates: true })
      )
    : unwrap(
        await journal(client)
          .from("call_alerts")
          .delete()
          .not("user_id", "is", null)
      );

/**
 * The partner pathway: calls the caller may answer through a partner they
 * are verified with (the partner's memorandum grants Journal submissions).
 */
export const myCallPathways = async (client: Client) =>
  unwrap(await journal(client).rpc("my_call_pathways")) ?? [];

/** Partners named on a published call (listed partners only). */
export const callPartnerNames = async (client: Client, callId: string) =>
  unwrap(
    await journal(client).rpc("call_partner_names", { call_id: callId })
  ) ?? [];

/** Partners a Journal manager may open a call to. */
export const submissionPartners = async (client: Client) =>
  unwrap(await journal(client).rpc("submission_partners")) ?? [];

/** The partners a call is open to (Journal managers). */
export const callPartnerIds = async (client: Client, callId: string) =>
  (
    unwrap(
      await journal(client)
        .from("call_partners")
        .select("partner_id")
        .eq("call_id", callId)
    ) ?? []
  ).map((row) => row.partner_id);

export const setCallPartners = async (
  client: Client,
  callId: string,
  partnerIds: readonly string[]
) => {
  const current = await callPartnerIds(client, callId);
  const add = partnerIds.filter((id) => !current.includes(id));
  const remove = current.filter((id) => !partnerIds.includes(id));
  if (add.length > 0) {
    unwrap(
      await journal(client)
        .from("call_partners")
        .insert(add.map((partner_id) => ({ call_id: callId, partner_id })))
    );
  }
  if (remove.length > 0) {
    unwrap(
      await journal(client)
        .from("call_partners")
        .delete()
        .eq("call_id", callId)
        .in("partner_id", remove)
    );
  }
};

/** Published calls that have not opened yet: announced ahead of time. */
export const upcomingCalls = async (client: Client, now = new Date()) =>
  unwrap(
    await journal(client)
      .from("calls")
      .select("*")
      .gt("opens_at", now.toISOString())
      .order("opens_at")
  );

export const publishedIssues = async (client: Client) =>
  unwrap(
    await journal(client)
      .from("issues")
      .select("*")
      .order("volume", { ascending: false })
      .order("number", { ascending: false })
  );

/**
 * A piece's address: under its section (/qirtas/news/<slug>; the overhaul,
 * Oct 30, 2026). Games has its own pages (/qirtas/games/<puzzle>), so a
 * Games piece is at /qirtas/pieces/<slug>.
 */
export const piecePath = (piece: {
  readonly desk?: string | null;
  readonly slug: string;
}) =>
  piece.desk && piece.desk !== "games"
    ? `/qirtas/${piece.desk}/${piece.slug}`
    : `/qirtas/pieces/${piece.slug}`;

export const latestPieces = async (client: Client, limit = 6) =>
  unwrap(
    await journal(client)
      .from("pieces")
      .select(
        "id, slug, desk, title_en, title_ar, category, language, members_only, published_at, contributor:contributors!pieces_contributor_id_fkey(slug, name_en, name_ar)"
      )
      .order("published_at", { ascending: false })
      .limit(limit)
  );

export const transition = async (
  client: Client,
  id: string,
  to: SubmissionStatus,
  note?: string
) =>
  unwrap(
    await journal(client).rpc("transition_submission", {
      id,
      note,
      to_status: to,
    })
  );

export const submitScore = async (
  client: Client,
  assignmentId: string,
  input: ScoreInput
) => {
  const score = scoreSchema.parse(input);
  return unwrap(
    await journal(client)
      .from("scores")
      .upsert(
        { assignment_id: assignmentId, ...score },
        { onConflict: "assignment_id" }
      )
      .select("total")
      .single()
  );
};

// ── Published Journal (public site) ───────────────────────────────────────────
// Each query also filters to published rows, so a signed-in editor's client
// would not show drafts either; RLS is still the boundary.

const pieceListColumns =
  "id, slug, title_en, title_ar, category, language, members_only, published_at, sort, contributor:contributors!pieces_contributor_id_fkey(slug, name_en, name_ar)";

const published = <
  T extends {
    lte: (c: string, v: string) => T;
    eq: (c: string, v: string) => T;
  },
>(
  query: T
) =>
  query.eq("status", "published").lte("published_at", new Date().toISOString());

export const issueBySlug = async (client: Client, slug: string) =>
  unwrap(
    await published(
      journal(client).from("issues").select("*").eq("slug", slug)
    ).maybeSingle()
  );

export const piecesInIssue = async (client: Client, issueId: string) =>
  unwrap(
    await published(
      journal(client)
        .from("pieces")
        .select(pieceListColumns)
        .eq("issue_id", issueId)
    ).order("sort")
  ) ?? [];

/** A piece and its text. Members-only text is withheld by RLS (body null). */
export const pieceBySlug = async (client: Client, slug: string) => {
  const piece = unwrap(
    await published(
      journal(client)
        .from("pieces")
        .select(
          `${pieceListColumns}, credit_en, credit_ar, image_path, issue:issues(slug, volume, number, title_en, title_ar)`
        )
        .eq("slug", slug)
    ).maybeSingle()
  );
  if (!piece) {
    return null;
  }
  const body = unwrap(
    await journal(client)
      .from("piece_bodies")
      .select("body_en, body_ar")
      .eq("piece_id", piece.id)
      .maybeSingle()
  );
  return { ...piece, body };
};

export const contributorBySlug = async (client: Client, slug: string) => {
  const contributor = unwrap(
    await journal(client)
      .from("contributors")
      .select("id, slug, name_en, name_ar, bio_en, bio_ar")
      .eq("slug", slug)
      .maybeSingle()
  );
  if (!contributor) {
    return null;
  }
  const pieces =
    unwrap(
      await published(
        journal(client)
          .from("pieces")
          .select(pieceListColumns)
          .eq("contributor_id", contributor.id)
      ).order("published_at", { ascending: false })
    ) ?? [];
  return { ...contributor, pieces };
};

// ── Waraq: the piece workflow ───────────────────────────────────────────────

/** Editing → Author approved → Approved → Scheduled → Published (or Unpublished). */
export const pieceStatuses = [
  "editing",
  "author_approved",
  "approved",
  "scheduled",
  "published",
  "unpublished",
] as const;
export type PieceStatus = (typeof pieceStatuses)[number];

/** desk: the desk editor; chief: the EIC or ME; copy: the Copy Chief. */
export const approvalKinds = ["desk", "chief", "copy"] as const;
export type ApprovalKind = (typeof approvalKinds)[number];

/**
 * The approvals a piece needs before it publishes (private.required_approvals):
 * the desk editor's on a named desk; the desk editor's and the chief's on an
 * Edition desk (Letters, Gallery). The Copy Chief's check is never required.
 */
export const requiredApprovals = (desk: Desk): readonly ApprovalKind[] =>
  desk === "letters" || desk === "gallery" ? ["desk", "chief"] : ["desk"];

/** The permission each approval needs (journal.approve_piece). */
export const approvalPermission = (kind: ApprovalKind, desk: Desk) => {
  if (kind === "desk") {
    return `journal.edit.${desk}` as const;
  }
  return kind === "chief" ? "journal.approve" : "journal.copy";
};

const DECKED: readonly Category[] = ["report", "feature", "interview"];

/**
 * What a type needs before it can publish: the same rules as
 * private.publish_check (both titles always).
 */
export const typeNeeds = (category: Category) => {
  const desk = deskOf(category);
  return {
    deck: DECKED.includes(category),
    media: desk === "gallery",
    text: desk !== "gallery" && desk !== "video",
    video: desk === "video",
  };
};

const SPACE = /\s+/u;
const PUNCTUATION = /[\p{P}\p{S}]+/gu;
const YOUTUBE =
  /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/** Words in rich text or plain text, for limits and reading time. */
export const wordCount = (text: string) => {
  // Paragraphs and line breaks separate words; the sanitizer drops tags.
  const plain = toPlainText(
    text.replaceAll("</p>", " </p>").replaceAll("<br", " <br")
  );
  return plain ? plain.split(SPACE).length : 0;
};

/** Reading time in minutes (about 220 words a minute), at least one. */
export const readingMinutes = (html: string) =>
  Math.max(1, Math.round(wordCount(html) / 220));

/** Six Words: exactly six words; punctuation does not count. */
export const isSixWords = (line: string) =>
  line.replace(PUNCTUATION, " ").trim().split(SPACE).filter(Boolean).length ===
  6;

/** Only YouTube links are embedded; any other link opens where it lives. */
export const youtubeId = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }
  return YOUTUBE.exec(url)?.[1] ?? null;
};

/** Named work (News, Video, Voices) in the caller's desks, with authors. */
export const deskQueue = async (client: Client) =>
  unwrap(await journal(client).rpc("desk_queue")) ?? [];

// ── Waraq on auibsal.org ────────────────────────────────────────────────────
// Published rows only, whoever asks (RLS is still the boundary).

const cardColumns =
  "id, slug, desk, category, language, title_en, title_ar, deck_en, deck_ar, members_only, published_at, front_rank, video_url, image_path, contributor:contributors!pieces_contributor_id_fkey(slug, name_en, name_ar), media:piece_media(storage_path, alt_en, alt_ar, width, height, sort)";

const fullColumns =
  "id, slug, desk, category, language, title_en, title_ar, deck_en, deck_ar, members_only, published_at, front_rank, video_url, image_path, credit_en, credit_ar, issue_id, contributor:contributors!pieces_contributor_id_fkey(slug, name_en, name_ar), media:piece_media(storage_path, alt_en, alt_ar, caption_en, caption_ar, width, height, sort), issue:issues(slug, title_en, title_ar)";

const publishedPieces = (client: Client) =>
  journal(client)
    .from("pieces")
    .select(cardColumns)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("sort", { ascending: true, referencedTable: "piece_media" });

export type PieceCard = NonNullable<
  Awaited<ReturnType<typeof deskPieces>>
>[number];

/** The latest published pieces on a desk (or of some types). */
export const deskPieces = async (
  client: Client,
  desk: Desk,
  {
    categories: only,
    limit = 12,
  }: { categories?: Category[]; limit?: number } = {}
) => {
  let query = publishedPieces(client).eq("desk", desk);
  if (only) {
    query = query.in("category", only);
  }
  return (
    unwrap(
      await query.order("published_at", { ascending: false }).limit(limit)
    ) ?? []
  );
};

/** Every published piece's address and date, newest first (the sitemap). */
export const publishedPieceSlugs = async (client: Client) =>
  unwrap(
    await journal(client)
      .from("pieces")
      .select("slug, desk, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
  ) ?? [];

/** The front page, as the Editor-in-Chief ordered it (1 is the lead). */
export const frontPieces = async (client: Client) =>
  unwrap(
    await publishedPieces(client)
      .not("front_rank", "is", null)
      .order("front_rank", { ascending: true })
  ) ?? [];

/** The latest Edition out, for the front page. */
export const currentEdition = async (client: Client) =>
  unwrap(
    await journal(client)
      .from("issues")
      .select("*")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

/** An Edition's pieces in its order, with their images. */
export const editionPieces = async (client: Client, issueId: string) =>
  unwrap(
    await publishedPieces(client)
      .eq("issue_id", issueId)
      .order("sort", { ascending: true })
  ) ?? [];

/** A published piece in full: text, images, credits and corrections. */
export const waraqPiece = async (client: Client, slug: string) => {
  const piece = unwrap(
    await journal(client)
      .from("pieces")
      .select(fullColumns)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .eq("slug", slug)
      .order("sort", { ascending: true, referencedTable: "piece_media" })
      .maybeSingle()
  );
  if (!piece) {
    return null;
  }
  const j = journal(client);
  const [body, credits, corrections] = await Promise.all([
    j
      .from("piece_bodies")
      .select("body_en, body_ar")
      .eq("piece_id", piece.id)
      .maybeSingle(),
    j
      .from("piece_credits")
      .select("role, sort, contributor:contributors(slug, name_en, name_ar)")
      .eq("piece_id", piece.id)
      .order("sort"),
    j
      .from("corrections")
      .select("note_en, note_ar, created_at")
      .eq("piece_id", piece.id)
      .order("created_at"),
  ]);
  return {
    ...piece,
    body: unwrap(body),
    corrections: unwrap(corrections) ?? [],
    credits: unwrap(credits) ?? [],
  };
};

/** A contributor's page: bio and every published piece. */
export const authorPage = async (client: Client, slug: string) => {
  const contributor = unwrap(
    await journal(client)
      .from("contributors")
      .select("id, slug, name_en, name_ar, bio_en, bio_ar")
      .eq("slug", slug)
      .maybeSingle()
  );
  if (!contributor) {
    return null;
  }
  const pieces =
    unwrap(
      await publishedPieces(client)
        .eq("contributor_id", contributor.id)
        .order("published_at", { ascending: false })
    ) ?? [];
  return { ...contributor, pieces };
};

/**
 * One language per page (SAL-BRD-01): a list on the English site shows the
 * pieces written in English (or in both), the Arabic site those in Arabic.
 * Rows without a language (calls, editions) pass through.
 */
export const inLanguage = <T>(list: readonly T[], locale: string): T[] =>
  list.filter((item) => {
    const { language } = item as { language?: string };
    return !language || language === "bilingual" || language === locale;
  });

// ── The Qirtas Prizes ───────────────────────────────────────────────────────

/** The six prizes, in order (journal.prizes). */
export const prizes = async (client: Client) =>
  unwrap(await journal(client).from("prizes").select("*").order("sort")) ?? [];

/** Published rounds, the latest first (managers also see drafts). */
export const prizeRounds = async (client: Client) =>
  unwrap(
    await journal(client)
      .from("prize_rounds")
      .select("*")
      .order("awarded_on", { ascending: false })
  ) ?? [];

/**
 * A round's shortlists from their day and its winners from theirs; before
 * the award a winner shows only as shortlisted (journal.prize_results).
 */
export const prizeResults = async (client: Client, roundSlug: string) =>
  unwrap(
    await journal(client).rpc("prize_results", { round_slug: roundSlug })
  ) ?? [];

/** The Diwan's view of a round: every entry, with its piece. */
export const prizeEntries = async (client: Client, roundId: string) =>
  unwrap(
    await journal(client)
      .from("prize_entries")
      .select(
        "id, prize_key, won, certificate_id, piece:pieces!prize_entries_piece_id_fkey(id, slug, title_en, title_ar, desk)"
      )
      .eq("round_id", roundId)
      .order("created_at")
  ) ?? [];

export const prizeJudges = async (client: Client, roundId: string) =>
  unwrap(
    await journal(client)
      .from("prize_judges")
      .select("id, prize_key, name_en, name_ar")
      .eq("round_id", roundId)
      .order("created_at")
  ) ?? [];
