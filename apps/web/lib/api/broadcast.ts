import "server-only";

import { project } from "@repo/config";
import type { AdminClient } from "@repo/database/admin";
import { resend, SENDER } from "@repo/email";
import type { Built } from "@repo/email/copy";
import {
  Notice,
  type NoticeFooterLine,
  noticeText,
} from "@repo/email/templates/notice";

/**
 * Resend Broadcasts for the emails that go to many people at once: the
 * Sunday Paper and the one-time invitation (decisions.md). One email
 * per person counts against the free plan's 100 a day, which sign-in emails
 * share; a Broadcast doesn't.
 *
 * The lists stay in the database. Each Broadcast gets a fresh segment, the
 * people it goes to are copied into it with one contact import, and it is
 * sent once the import is done; the segment is deleted after the Broadcast
 * has gone (the free plan keeps three). Its progress is a row in
 * core.broadcasts, so a run that stops halfway carries on where it was.
 * Unsubscribes made through Resend are read back before each send
 * (`pullUnsubscribes`), and those contacts are deleted from Resend once
 * the site's list has them.
 */

/** A Broadcast still on its way (the contact import is running): try again later. */
export class BroadcastPending extends Error {
  override name = "BroadcastPending";
}

export interface BroadcastContact {
  readonly email: string;
  readonly firstName?: string | null;
  /** Contact properties, as the email's placeholders name them. */
  readonly properties: Readonly<Record<string, string>>;
}

export interface BroadcastJob {
  readonly built: Built;
  readonly contacts: readonly BroadcastContact[];
  /**
   * Leave the Broadcast as a draft in Resend for a person to send (the
   * invitation, decisions.md); otherwise it goes at once.
   */
  readonly draft?: boolean;
  readonly footer: NoticeFooterLine[];
  /** One row in core.broadcasts, for example "sunday-paper:2026-12:en". */
  readonly key: string;
  readonly kind: "invitation" | "sunday_paper";
  readonly lang: "ar" | "en";
}

/** The contact properties the emails use; each is made in Resend once. */
const PROPERTIES = ["stop_url", "greeting", "tour_line"] as const;

/** How long one run waits for an import before leaving it for the next. */
const IMPORT_WAIT_MS = 25_000;

const client = () => {
  if (!resend) {
    throw new Error("Email is not configured: set RESEND_TOKEN.");
  }
  return resend;
};

/** A Resend answer, or the reason it was refused. */
const ok = <T>(
  answer: { data: T | null; error: { message: string; name?: string } | null },
  what: string
): T => {
  if (answer.error || !answer.data) {
    const reason = answer.error?.message ?? "no answer";
    // A key made for sending only can't manage contacts or Broadcasts.
    const hint =
      answer.error?.name === "restricted_api_key"
        ? " RESEND_TOKEN needs full access (Resend → API Keys)."
        : "";
    throw new Error(`Resend ${what}: ${reason}.${hint}`);
  }
  return answer.data;
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** One CSV field: quoted, quotes doubled. */
const field = (value: string) => `"${value.replaceAll('"', '""')}"`;

/** Text in HTML from a placeholder: Resend inserts properties as they are. */
const htmlSafe = (value: string) =>
  value.replaceAll("&", "and").replaceAll("<", "‹").replaceAll(">", "›");

export const contactsCsv = (contacts: readonly BroadcastContact[]) => {
  const header = ["email", "first_name", ...PROPERTIES];
  const rows = contacts.map((c) =>
    [
      c.email,
      htmlSafe(c.firstName ?? ""),
      ...PROPERTIES.map((key) => htmlSafe(c.properties[key] ?? "")),
    ]
      .map(field)
      .join(",")
  );
  return [header.map(field).join(","), ...rows].join("\n");
};

/** Makes the contact properties the emails need, if Resend lacks them. */
const ensureProperties = async () => {
  const listed = ok(await client().contactProperties.list(), "properties");
  const have = new Set(listed.data.map((p) => p.key));
  for (const key of PROPERTIES) {
    if (!have.has(key)) {
      // biome-ignore lint/performance/noAwaitInLoops: a few, once
      const made = await client().contactProperties.create({
        key,
        type: "string",
      });
      ok(made, `property ${key}`);
    }
  }
};

/**
 * Unsubscribes made through Resend (its link or one-click in the inbox)
 * become the site's: a member stops optional email, a subscriber leaves the
 * public list, an invited address leaves the invitation list. The contact
 * is then deleted from Resend, so if they turn the paper back on later on
 * the site, the next send makes them a fresh, subscribed contact.
 */
export const pullUnsubscribes = async (admin: AdminClient) => {
  const gone: string[] = [];
  let after: string | undefined;
  for (;;) {
    // biome-ignore lint/performance/noAwaitInLoops: pages, in order
    const listed = await client().contacts.list({
      limit: 100,
      ...(after ? { after } : {}),
    });
    const page = ok(listed, "contacts");
    for (const contact of page.data) {
      if (contact.unsubscribed) {
        gone.push(contact.email.toLowerCase());
      }
    }
    if (!page.has_more || page.data.length === 0) {
      break;
    }
    after = page.data.at(-1)?.id;
  }
  if (gone.length === 0) {
    return 0;
  }
  const { error } = await admin
    .schema("core")
    .rpc("apply_broadcast_unsubscribes", { emails: gone });
  if (error) {
    throw error;
  }
  for (const email of gone) {
    // biome-ignore lint/performance/noAwaitInLoops: Resend's rate limit
    await client().contacts.remove({ email });
  }
  return gone.length;
};

type Stage = "new" | "segment" | "imported" | "sent" | "done" | "empty";

interface Row {
  broadcast_id: string | null;
  import_id: string | null;
  key: string;
  segment_id: string | null;
  stage: Stage;
}

const save = async (
  admin: AdminClient,
  key: string,
  values: Partial<Row> & { recipients?: number }
) => {
  const { error } = await admin
    .schema("core")
    .from("broadcasts")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) {
    throw error;
  }
};

/**
 * Deletes the segments of Broadcasts that have gone, so the next ones have
 * room (the free plan keeps three segments).
 */
export const cleanUpSegments = async (admin: AdminClient) => {
  const { data } = await admin
    .schema("core")
    .from("broadcasts")
    .select("key, segment_id, broadcast_id")
    .eq("stage", "sent");
  for (const row of data ?? []) {
    if (!row.broadcast_id) {
      continue;
    }
    // biome-ignore lint/performance/noAwaitInLoops: a few, in order
    const broadcast = await client().broadcasts.get(row.broadcast_id);
    if (broadcast.data?.status !== "sent") {
      continue;
    }
    if (row.segment_id) {
      await client().segments.remove(row.segment_id);
    }
    await save(admin, row.key, { segment_id: null, stage: "done" });
  }
};

/** Waits for a contact import; false while it is still running. */
const importDone = async (importId: string) => {
  const started = Date.now();
  for (;;) {
    // biome-ignore lint/performance/noAwaitInLoops: polling
    const found = ok(await client().contacts.imports.get(importId), "import");
    if (found.status === "completed") {
      return true;
    }
    if (found.status === "failed") {
      throw new Error(`Resend import ${importId} failed.`);
    }
    if (Date.now() - started > IMPORT_WAIT_MS) {
      return false;
    }
    await wait(2000);
  }
};

/**
 * Takes one Broadcast as far as it can go: a segment, the contact import,
 * then the Broadcast itself. Throws BroadcastPending while the import runs.
 */
/** Leaves out addresses that bounced or complained (core.email_suppressions). */
const withoutSuppressed = async (
  admin: AdminClient,
  contacts: readonly BroadcastContact[]
) => {
  const emails = contacts.map((c) => c.email.toLowerCase());
  const chunks = Array.from(
    { length: Math.ceil(emails.length / 500) },
    (_, i) => emails.slice(i * 500, i * 500 + 500)
  );
  const found = await Promise.all(
    chunks.map((chunk) =>
      admin
        .schema("core")
        .from("email_suppressions")
        .select("email")
        .in("email", chunk)
    )
  );
  const suppressed = new Set(
    found.flatMap((r) => (r.data ?? []).map((x) => x.email))
  );
  return contacts.filter((c) => !suppressed.has(c.email.toLowerCase()));
};

export const runBroadcast = async (admin: AdminClient, job: BroadcastJob) => {
  await admin
    .schema("core")
    .from("broadcasts")
    .upsert(
      { key: job.key, kind: job.kind, lang: job.lang },
      { ignoreDuplicates: true, onConflict: "key" }
    );
  const { data: found } = await admin
    .schema("core")
    .from("broadcasts")
    .select("key, stage, segment_id, import_id, broadcast_id")
    .eq("key", job.key)
    .single();
  const row = found as Row;

  if (row.stage === "new") {
    if (job.contacts.length === 0) {
      await save(admin, job.key, { stage: "empty" });
      return;
    }
    const segment = ok(
      await client().segments.create({ name: `auibsal.org ${job.key}` }),
      "segment"
    );
    row.segment_id = segment.id;
    row.stage = "segment";
    await save(admin, job.key, { segment_id: segment.id, stage: "segment" });
  }

  if (row.stage === "segment" && row.segment_id) {
    await ensureProperties();
    const csv = contactsCsv(await withoutSuppressed(admin, job.contacts));
    const started = ok(
      await client().contacts.imports.create({
        columnMap: {
          email: "email",
          firstName: "first_name",
          properties: Object.fromEntries(
            PROPERTIES.map((key) => [key, { column: key, type: "string" }])
          ),
        },
        file: new Blob([csv], { type: "text/csv" }),
        onConflict: "upsert",
        segments: [{ id: row.segment_id }],
      }),
      "import"
    );
    row.import_id = started.id;
    row.stage = "imported";
    await save(admin, job.key, {
      import_id: started.id,
      recipients: job.contacts.length,
      stage: "imported",
    });
  }

  if (row.stage === "imported" && row.segment_id && row.import_id) {
    if (!(await importDone(row.import_id))) {
      throw new BroadcastPending(`${job.key}: the contact import is running.`);
    }
    const sent = ok(
      await client().broadcasts.create({
        from: SENDER,
        name: job.key,
        react: Notice({
          blocks: job.built.blocks,
          footer: job.footer,
          preview: job.built.preview,
        }),
        // Replies reach a person, never a no-reply box.
        replyTo: project.supportEmail,
        segmentId: row.segment_id,
        ...(job.draft ? { send: false as const } : { send: true as const }),
        subject: job.built.subject,
        text: noticeText({ blocks: job.built.blocks, footer: job.footer }),
      }),
      "broadcast"
    );
    await save(admin, job.key, { broadcast_id: sent.id, stage: "sent" });
  }
};
