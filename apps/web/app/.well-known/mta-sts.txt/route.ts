import { mtaStsPolicy } from "@/lib/mta-sts";

/** The MTA-STS policy at its standard address (lib/mta-sts.ts). */
export const GET = () =>
  new Response(mtaStsPolicy(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
