import { env } from "@/env";

// The Nexus and the public pages share this origin; /v1 (third-party apps)
// sets its own CORS in lib/api/v1.ts.
const allowedOrigins = () =>
  new Set([new URL(env.NEXT_PUBLIC_SITE_URL).origin]);

/** CORS headers for an allowed origin; empty for anything else. */
export const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get("origin");

  if (!(origin && allowedOrigins().has(origin))) {
    return {};
  }

  return {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

export const preflight = (request: Request) =>
  new Response(null, { headers: corsHeaders(request), status: 204 });
