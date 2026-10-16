import { env } from "@/env";

// The Authorized Digital Sellers file AdSense checks before it serves ads:
// only the Society's own AdSense account may sell space on auibsal.org.
export const dynamic = "force-static";

export const GET = () => {
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) {
    return new Response(null, { status: 404 });
  }
  return new Response(
    `google.com, ${client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`,
    { headers: { "content-type": "text/plain; charset=utf-8" } }
  );
};
