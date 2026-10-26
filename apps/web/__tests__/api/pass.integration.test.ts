// @vitest-environment node
/**
 * The IDEA Pass and SAL accounts, against a local stack: an existing member
 * is found by the AUIB address the Pass checked, a student who signed up
 * with another address moves to the AUIB one, and a new person gets an
 * account linked to their Pass.
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
  auibEmail: null,
  email: null,
  familyName: null,
  givenName: null,
  locale: null,
  sub: `pass-${crypto.randomUUID()}`,
  ...fields,
});

describe.skipIf(!enabled)("signing in with The IDEA Pass", () => {
  const stamp = Date.now();
  const admin = createClient<Database>(url, secretKey || "skipped", {
    auth: { persistSession: false },
  });
  const browser = () =>
    createClient<Database>(url, publishableKey || "skipped", {
      auth: { persistSession: false },
    });

  const signsIn = async (tokenHash: string) => {
    const client = browser();
    const { data, error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    expect(error).toBeNull();
    return data.user;
  };

  test("an existing member is found by their checked AUIB address", async () => {
    const { signInWithPass } = await import("@/lib/api/pass-account");
    const email = `pass-member-${stamp}@auib.edu.iq`;
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    const pass = identity({ auibEmail: email, email: `me-${stamp}@gmail.com` });
    const result = await signInWithPass(admin, pass, SECRET);
    expect(result.status).toBe("signed_in");
    const user = await signsIn((result as { tokenHash: string }).tokenHash);
    expect(user?.id).toBe(created.data.user?.id);

    // Next time the link alone finds them.
    const again = await signInWithPass(
      admin,
      { ...pass, auibEmail: null, email: null },
      SECRET
    );
    expect(again.status).toBe("signed_in");
  });

  test("a student who joined with another address moves to the AUIB one", async () => {
    const { signInWithPass } = await import("@/lib/api/pass-account");
    const personal = `pass-outside-${stamp}@example.com`;
    const auib = `pass-student-${stamp}@auib.edu.iq`;
    const created = await admin.auth.admin.createUser({
      email: personal,
      email_confirm: true,
    });
    const result = await signInWithPass(
      admin,
      identity({ auibEmail: auib, email: personal }),
      SECRET
    );
    // Found by the Pass's own address, then moved to the AUIB one.
    expect(result.status).toBe("signed_in");
    const { data } = await admin.auth.admin.getUserById(
      created.data.user?.id ?? ""
    );
    expect(data.user?.email).toBe(auib);
    const { data: verified } = await admin
      .schema("membership")
      .from("memberships")
      .select("user_id")
      .eq("user_id", created.data.user?.id ?? "")
      .maybeSingle();
    expect(verified).not.toBeNull();
  });

  test("a new person gets an account linked to their Pass", async () => {
    const { createWithPass, signInWithPass } = await import(
      "@/lib/api/pass-account"
    );
    const pass = identity({
      auibEmail: `pass-new-${stamp}@auib.edu.iq`,
      givenName: "New",
    });
    const first = await signInWithPass(admin, pass, SECRET);
    expect(first.status).toBe("unmatched");
    const made = await createWithPass(admin, pass, "en");
    const user = await signsIn((made as { tokenHash: string }).tokenHash);
    expect(user?.email).toBe(pass.auibEmail);
    const { data: link } = await admin
      .schema("access")
      .from("pass_links")
      .select("pass_sub")
      .eq("user_id", user?.id ?? "")
      .single();
    expect(link?.pass_sub).toBe(pass.sub);
  });
});
