// @vitest-environment node
/**
 * Live where people share a screen, against a local stack: two devices at
 * one door see each other's check-in within seconds, and someone who may
 * not check people in there receives nothing.
 * Needs: SUPABASE_INTEGRATION=1 API_URL=… PUBLISHABLE_KEY=… SECRET_KEY=…
 */
import type { Database } from "@repo/database";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const url = process.env.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SECRET_KEY ?? "";
const enabled = Boolean(
  process.env.SUPABASE_INTEGRATION && publishableKey && secretKey
);
const PASSWORD = "integration-test-1";

const signIn = async (email: string) => {
  const c = createClient<Database>(url, publishableKey || "skipped", {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    throw error;
  }
  return c;
};

/** Joins the door's channel; resolves each check-in's count heard. */
const listen = async (c: SupabaseClient<Database>, topic: string) => {
  await c.realtime.setAuth();
  const heard: number[] = [];
  await new Promise<void>((resolve) => {
    c.channel(topic, { config: { private: true } })
      .on("broadcast", { event: "check_in" }, ({ payload }) => {
        heard.push(Number((payload as { count?: number }).count ?? 0));
      })
      .subscribe((status, error) => {
        if (status !== "SUBSCRIBED" && process.env.LIVE_DEBUG) {
          console.log(topic, status, error?.message);
        }
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") {
          resolve();
        }
      });
  });
  return heard;
};

/** Whether `check` comes true within `ms`, looked at every 100 ms. */
const within = (check: () => boolean, ms: number) =>
  new Promise<boolean>((resolve) => {
    const until = Date.now() + ms;
    const look = () => {
      if (check() || Date.now() >= until) {
        resolve(check());
        return;
      }
      setTimeout(look, 100);
    };
    look();
  });

describe.skipIf(!enabled)("the door, live", () => {
  const stamp = Date.now();
  const emails = {
    first: `door-a-${stamp}@auib.edu.iq`,
    guest: `door-guest-${stamp}@auib.edu.iq`,
    outsider: `door-out-${stamp}@auib.edu.iq`,
    second: `door-b-${stamp}@auib.edu.iq`,
  };
  const admin = createClient<Database>(url, secretKey || "skipped", {
    auth: { persistSession: false },
  });
  const ids: Record<string, string> = {};
  let eventId = "";
  const clients: SupabaseClient<Database>[] = [];

  beforeAll(async () => {
    const created = await Promise.all(
      Object.values(emails).map((email) =>
        admin.auth.admin.createUser({
          email,
          email_confirm: true,
          password: PASSWORD,
        })
      )
    );
    for (const { data, error } of created) {
      if (error) {
        throw error;
      }
      ids[data.user.email ?? ""] = data.user.id;
    }
    const event = await admin
      .schema("api")
      .from("events")
      .insert({
        slug: `live-door-${stamp}`,
        starts_at: new Date().toISOString(),
        title_ar: "عند الباب",
        title_en: "At the door",
      })
      .select("id")
      .single();
    if (event.error) {
      throw event.error;
    }
    eventId = event.data.id;
    await admin
      .schema("api")
      .from("event_staff")
      .insert([
        { event_id: eventId, user_id: ids[emails.first] ?? "" },
        { event_id: eventId, user_id: ids[emails.second] ?? "" },
      ]);
  }, 30_000);

  afterAll(async () => {
    await Promise.all(clients.map((c) => c.removeAllChannels()));
  });

  test("both devices hear a check-in; an outsider hears nothing", async () => {
    const topic = `sal:checkin:${eventId}`;
    const [first, second, outsider] = await Promise.all([
      signIn(emails.first),
      signIn(emails.second),
      signIn(emails.outsider),
    ]);
    clients.push(first, second, outsider);
    const heardFirst = await listen(first, topic);
    const heardSecond = await listen(second, topic);
    const heardOutsider = await listen(outsider, topic);

    const checkIn = await admin
      .schema("api")
      .from("check_ins")
      .insert({
        checked_in_by: ids[emails.first] ?? "",
        event_id: eventId,
        method: "manual",
        user_id: ids[emails.guest] ?? "",
      });
    expect(checkIn.error).toBeNull();

    expect(
      await within(
        () => heardFirst.includes(1) && heardSecond.includes(1),
        5000
      )
    ).toBe(true);
    expect(heardOutsider).toEqual([]);
  }, 30_000);
});
