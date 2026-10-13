import { type NextRequest, NextResponse } from "next/server";
import { checkAccess } from "./lib/gate";

/**
 * The SAL Design System is for Society officers: every request (the
 * stories, the manager and the static files Storybook builds into public/)
 * passes the Nexus check in lib/gate.ts first. Next.js runs this proxy on
 * Vercel for every path, so there is no vendor login in front of it.
 */
export const config = { matcher: "/:path*" };

const FORBIDDEN = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAL Design System</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#273236;background:#faf7f5"><h1>SAL Design System</h1><p>This is for Society officers. If you hold a role and still see this, finish two-step sign-in in the Nexus, then come back.</p><p><a href="https://nexus.auibsal.org">Open the Nexus</a></p></body></html>`;

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const nexusUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://nexus.auibsal.org";
  if (!(supabaseUrl && publishableKey)) {
    // Fail closed.
    return new NextResponse("Not configured", { status: 503 });
  }
  const result = await checkAccess(request, {
    nexusUrl,
    publishableKey,
    supabaseUrl,
  });
  if (result.kind === "allow") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (result.kind === "sign-in") {
    return NextResponse.redirect(result.location, 302);
  }
  return new NextResponse(FORBIDDEN, {
    headers: { "content-type": "text/html; charset=utf-8" },
    status: 403,
  });
}
