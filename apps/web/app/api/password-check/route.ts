import { problem } from "@/lib/api/problem";

const PREFIX = /^[0-9A-F]{5}$/u;

/**
 * The breached-password check (NIST SP 800-63B §5.1.1.2) for sign-up,
 * reset and change: the browser sends the first five characters of the
 * password's SHA-1 and gets back Have I Been Pwned's list of suffixes
 * with that prefix (k-anonymity: neither this route nor HIBP sees the
 * password). Padded responses, cached a day.
 */
export const GET = async (request: Request): Promise<Response> => {
  const prefix = (new URL(request.url).searchParams.get("prefix") ?? "")
    .trim()
    .toUpperCase();
  if (!PREFIX.test(prefix)) {
    return problem(400, "invalid_prefix");
  }
  const upstream = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}`,
    {
      headers: { "Add-Padding": "true", "User-Agent": "auibsal.org" },
      next: { revalidate: 86_400 },
    }
  ).catch(() => null);
  if (!upstream?.ok) {
    return problem(503, "unavailable");
  }
  return new Response(await upstream.text(), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
