import "server-only";

import type { Database } from "@repo/database";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { authCookieOptions } from "./cookies";
import { keys } from "./keys";

const BEARER = /^Bearer\s+(.+)$/i;

/**
 * Authenticates an API request by its `Authorization: Bearer <access token>`
 * header, how the site's own pages (client-rendered) call the API routes.
 * Returns the verified claims and a client that acts as that user, so Row
 * Level Security applies to its queries. There are no third-party apps
 * (decisions.md): a token issued to one (it carries a client_id) is
 * refused.
 */
export const authenticateRequest = async (request: Request) => {
  const token = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    keys();

  if (
    !(token && NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ) {
    return null;
  }

  const supabase = createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data) {
    return null;
  }

  if (typeof data.claims.client_id === "string" && data.claims.client_id) {
    return null;
  }

  return { claims: data.claims, supabase, userId: data.claims.sub };
};

/**
 * Authenticates a request by its session cookies, for what the browser loads
 * itself (a framed page and its files) and so can't send a bearer token.
 * Read only: the session is refreshed by the pages, never here.
 */
export const authenticateCookies = async (request: Request) => {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    keys();
  if (!(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return null;
  }
  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "").map(
    ({ name, value }) => ({ name, value: value ?? "" })
  );
  const supabase = createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: authCookieOptions(),
      cookies: {
        getAll: () => cookies,
        setAll: () => undefined,
      },
    }
  );
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return null;
  }
  if (typeof data.claims.client_id === "string" && data.claims.client_id) {
    return null;
  }
  return { claims: data.claims, supabase, userId: data.claims.sub };
};

/**
 * Whether the session's last sign-in step (any method: password, link,
 * code, passkey, two-step) was within the last `minutes`, from the token's
 * `amr` claim. Reauthentication before a destructive step (decisions §11:
 * deleting the account) asks for this.
 */
export const signedInWithin = (
  claims: { amr?: unknown },
  minutes: number,
  now = Date.now()
) => {
  const steps = Array.isArray(claims.amr) ? claims.amr : [];
  const latest = Math.max(
    0,
    ...steps.map((step) =>
      step && typeof step === "object" && "timestamp" in step
        ? Number((step as { timestamp: unknown }).timestamp) || 0
        : 0
    )
  );
  return latest * 1000 >= now - minutes * 60_000;
};
