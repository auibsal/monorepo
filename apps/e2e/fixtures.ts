import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";

export const admin = () =>
  createClient(SUPABASE_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export const PASSWORD = "E2e-pass-12345";
export const member = { email: "e2e-member@auib.edu.iq", name: "E2E Member" };
export const editor = { email: "e2e-editor@auib.edu.iq", name: "E2E Editor" };
/**
 * The co-editing journey's two officers: minutes are written only by the
 * President and the General Secretary, whose roles need two-step sign-in.
 */
export const president = {
  email: "e2e-president@auib.edu.iq",
  name: "E2E President",
};
export const editor2 = {
  email: "e2e-editor-2@auib.edu.iq",
  name: "E2E Second Editor",
};
export const event = { slug: "e2e-open-pages", title: "Open Pages (e2e)" };
/** A date from AUIB's calendar, as the hourly sync stores it. */
export const universityDate = {
  title: "Last day to withdraw (e2e)",
  uid: "e2e-auib-withdraw@auib.edu.iq",
  url: "https://auib.edu.iq/event/e2e-withdraw/",
};
