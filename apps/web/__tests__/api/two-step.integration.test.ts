// @vitest-environment node
/**
 * Getting back into two-step sign-in, against a local stack: recovery codes
 * only on a second-step session, one code removes the lost authenticator
 * once, and only whoever assigns roles resets someone else's.
 * Needs: SUPABASE_INTEGRATION=1 API_URL=… PUBLISHABLE_KEY=… SECRET_KEY=…
 */
import { createHmac } from "node:crypto";
import type { Database } from "@repo/database";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const url = process.env.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SECRET_KEY ?? "";
const enabled = Boolean(
  process.env.SUPABASE_INTEGRATION && publishableKey && secretKey
);

process.env.SKIP_ENV_VALIDATION = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey;
process.env.SUPABASE_SECRET_KEY = secretKey;

const PASSWORD = "integration-test-1";
const PADDING = /[=]+$/;

// RFC 6238 with Supabase's settings (SHA-1, 30 s, 6 digits).
const base32 = (secret: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(PADDING, "")) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};
const totp = (secret: string) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const mac = createHmac("sha1", base32(secret)).update(counter).digest();
  // The low nibble of the last byte, and the 31 bits read there (RFC 4226).
  const offset = (mac.at(-1) ?? 0) % 16;
  return String((mac.readUInt32BE(offset) % 2 ** 31) % 1_000_000).padStart(
    6,
    "0"
  );
};

const client = () =>
  createClient<Database>(url, publishableKey || "skipped", {
    auth: { persistSession: false },
  });

const signIn = async (email: string) => {
  const c = client();
  const { error } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    throw error;
  }
  return c;
};

/** Sets up an authenticator app; the session is then at aal2. */
const enrollTotp = async (c: SupabaseClient<Database>) => {
  const enrolled = await c.auth.mfa.enroll({ factorType: "totp" });
  if (enrolled.error) {
    throw enrolled.error;
  }
  const verified = await c.auth.mfa.challengeAndVerify({
    code: totp(enrolled.data.totp.secret),
    factorId: enrolled.data.id,
  });
  if (verified.error) {
    throw verified.error;
  }
};

const token = async (c: SupabaseClient<Database>) =>
  (await c.auth.getSession()).data.session?.access_token ?? "";

const post = async (
  route: { POST: (request: Request) => Promise<Response> },
  bearer: string,
  body: object
) => {
  const response = await route.POST(
    new Request("http://localhost/api/two-step", {
      body: JSON.stringify(body),
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
      },
      method: "POST",
    })
  );
  return {
    body: (await response.json()) as Record<string, unknown>,
    status: response.status,
  };
};

describe.skipIf(!enabled)("two-step recovery", () => {
  const stamp = Date.now();
  const officer = `rc-officer-${stamp}@auib.edu.iq`;
  const president = `rc-president-${stamp}@auib.edu.iq`;
  const member = `rc-member-${stamp}@auib.edu.iq`;
  const admin = createClient<Database>(url, secretKey || "skipped", {
    auth: { persistSession: false },
  });
  const ids: Record<string, string> = {};
  let codes: string[] = [];
  let routes: {
    codes: typeof import("@/app/api/two-step/recovery-codes/route");
    recover: typeof import("@/app/api/two-step/recover/route");
    reset: typeof import("@/app/api/two-step/reset/route");
  };

  const factors = async (userId: string) =>
    (await admin.auth.admin.mfa.listFactors({ userId })).data?.factors ?? [];

  beforeAll(async () => {
    const created = await Promise.all(
      [officer, president, member].map((email) =>
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
    await admin.schema("access").from("role_assignments").insert({
      role: "president",
      scope_type: "global",
      user_id: ids[president],
    });
    routes = {
      codes: await import("@/app/api/two-step/recovery-codes/route"),
      recover: await import("@/app/api/two-step/recover/route"),
      reset: await import("@/app/api/two-step/reset/route"),
    };
  });

  test("codes are made only after the second step", async () => {
    const first = await signIn(officer);
    expect((await post(routes.codes, await token(first), {})).status).toBe(403);
    await enrollTotp(first);
    const made = await post(routes.codes, await token(first), {});
    expect(made.status).toBe(200);
    codes = made.body.codes as string[];
    expect(codes).toHaveLength(10);
  });

  test("one code, typed loosely, removes the lost authenticator once", async () => {
    const later = await signIn(officer);
    const bearer = await token(later);
    expect(
      (await post(routes.recover, bearer, { code: "AAAA-BBBB-CCCC" })).status
    ).toBe(400);
    expect(await factors(ids[officer])).toHaveLength(1);

    const typed = (codes[0] ?? "").toLowerCase().replace(/-/g, " ");
    expect((await post(routes.recover, bearer, { code: typed })).status).toBe(
      200
    );
    expect(await factors(ids[officer])).toHaveLength(0);
    expect(
      (await post(routes.recover, bearer, { code: codes[0] })).status
    ).toBe(400);

    const { data: resets } = await admin
      .schema("access")
      .from("two_step_resets")
      .select("via, reset_by")
      .eq("user_id", ids[officer]);
    expect(resets).toEqual([{ reset_by: null, via: "recovery_code" }]);
    const { count } = await admin
      .schema("core")
      .from("outbox")
      .select("id", { count: "exact", head: true })
      .eq("kind", "access.two_step_reset")
      .eq("payload->>user_id", ids[officer]);
    expect(count).toBe(1);
  });

  test("only whoever assigns roles resets someone else's", async () => {
    await enrollTotp(await signIn(officer));
    expect(await factors(ids[officer])).toHaveLength(1);

    const plain = await signIn(member);
    expect(
      (await post(routes.reset, await token(plain), { userId: ids[officer] }))
        .status
    ).toBe(403);

    // The president's role counts only after their own second step.
    const chair = await signIn(president);
    expect(
      (await post(routes.reset, await token(chair), { userId: ids[officer] }))
        .status
    ).toBe(403);
    await enrollTotp(chair);
    const bearer = await token(chair);
    expect(
      (await post(routes.reset, bearer, { userId: ids[president] })).status
    ).toBe(400);
    expect(
      (await post(routes.reset, bearer, { userId: ids[officer] })).status
    ).toBe(200);
    expect(await factors(ids[officer])).toHaveLength(0);
    const { count } = await admin
      .schema("access")
      .from("recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ids[officer]);
    expect(count).toBe(0);
  });
});
