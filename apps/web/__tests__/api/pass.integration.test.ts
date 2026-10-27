// @vitest-environment node
/**
 * The IDEA Pass and SAL accounts, against a local stack: an existing member
 * is found by the Pass's verified address, a student status from the Pass
 * makes a member, and a new person gets an account linked to their Pass.
 * Needs: SUPABASE_INTEGRATION=1 API_URL=… PUBLISHABLE_KEY=… SECRET_KEY=…
 */
import type { Database } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, test, vi } from "vitest";
import type { PassIdentity } from "@/lib/api/pass";

vi.mock("server-only", () => ({}));

const url = process.env.API_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SECRET_KEY ?? "";
const enabled = Boolean(
  process.env.SUPABASE_INTEGRATION && publishableKey && secretKey
);

process.env.SKIP_ENV_VALIDATION = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.SUPABASE_SECRET_KEY = secretKey;

const SECRET = "t".repeat(32);

const identity = (fields: Partial<PassIdentity>): PassIdentity => ({
  email: null,
  familyName: null,
  givenName: null,
  locale: null,
  studentUntil: null,
  sub: `pass-${crypto.randomUUID()}`,
  ...fields,
});

describe.skipIf(!enabled)("signing in with The IDEA Pass", () => {
  const stamp = Date.now();
  const nextYear = `${new Date().getFullYear() + 1}-06-30`;
  const admin = createClient<Database>(url, secretKey || "skipped", {
    auth: { persistSession: false },
  });
  const browser = () =>
    createClient<Database>(url, publishableKey || "skipped", {
      auth: { persistSession: false },
    });

  const signsIn = async (tokenHash: string) => {
    const { data, error } = await browser().auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    expect(error).toBeNull();
    return data.user;
  };

  const isMember = async (userId: string) => {
    const { data } = await admin
      .schema("membership")
      .from("memberships")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return data !== null;
  };

  test("an existing member is found by the Pass's verified address", async () => {
    const { signInWithPass } = await import("@/lib/api/pass-account");
    const email = `pass-member-${stamp}@auib.edu.iq`;
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    const pass = identity({ email });
    const result = await signInWithPass(admin, pass, SECRET);
    expect(result.status).toBe("signed_in");
    const user = await signsIn((result as { tokenHash: string }).tokenHash);
    expect(user?.id).toBe(created.data.user?.id);

    // Next time the link alone finds them.
    const again = await signInWithPass(admin, { ...pass, email: null }, SECRET);
    expect(again.status).toBe("signed_in");
  });

  test("a student status from the Pass makes a member", async () => {
    const { signInWithPass } = await import("@/lib/api/pass-account");
    const personal = `pass-outside-${stamp}@example.com`;
    const created = await admin.auth.admin.createUser({
      email: personal,
      email_confirm: true,
    });
    const id = created.data.user?.id ?? "";
    expect(await isMember(id)).toBe(false);
    const result = await signInWithPass(
      admin,
      identity({ email: personal, studentUntil: nextYear }),
      SECRET
    );
    expect(result.status).toBe("signed_in");
    expect(await isMember(id)).toBe(true);
  });

  test("a new person gets an account linked to their Pass", async () => {
    const { createWithPass, signInWithPass } = await import(
      "@/lib/api/pass-account"
    );
    const pass = identity({
      email: `pass-new-${stamp}@gmail.com`,
      givenName: "New",
      studentUntil: nextYear,
    });
    const first = await signInWithPass(admin, pass, SECRET);
    expect(first.status).toBe("unmatched");
    const made = await createWithPass(admin, pass, "en");
    const user = await signsIn((made as { tokenHash: string }).tokenHash);
    expect(user?.email).toBe(pass.email);
    const { data: link } = await admin
      .schema("access")
      .from("pass_links")
      .select("pass_sub, student_until")
      .eq("user_id", user?.id ?? "")
      .single();
    expect(link).toEqual({ pass_sub: pass.sub, student_until: nextYear });
    expect(await isMember(user?.id ?? "")).toBe(true);
  });
});
