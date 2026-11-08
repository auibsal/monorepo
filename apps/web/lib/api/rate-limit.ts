import "server-only";

import { createHash } from "node:crypto";
import { BlockList, isIP } from "node:net";
import { createAdminClient } from "@repo/database/admin";
import { log } from "@/lib/observability/log";

/**
 * Cloudflare's published edge ranges (cloudflare.com/ips). A request whose
 * connecting address is one of them came through Cloudflare, so its
 * CF-Connecting-IP header is Cloudflare's and can be trusted; from anywhere
 * else (a direct *.vercel.app request) that header is the caller's own
 * claim and is ignored.
 */
const CLOUDFLARE = (() => {
  const list = new BlockList();
  for (const range of [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]) {
    const [net, bits] = range.split("/");
    list.addSubnet(net ?? "", Number(bits), "ipv4");
  }
  for (const range of [
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
    "2a06:98c0::/29",
    "2c0f:f248::/32",
  ]) {
    const [net, bits] = range.split("/");
    list.addSubnet(net ?? "", Number(bits), "ipv6");
  }
  return list;
})();

const first = (value: string | null) => value?.split(",")[0]?.trim() || null;

/** Whether an address is one of Cloudflare's edge servers. */
export const fromCloudflare = (ip: string | null) => {
  const family = ip ? isIP(ip) : 0;
  if (!(ip && family)) {
    return false;
  }
  return CLOUDFLARE.check(ip, family === 6 ? "ipv6" : "ipv4");
};

/**
 * The visitor's address. Vercel sets X-Real-IP (and X-Vercel-Forwarded-For)
 * to the address that connected to it, which callers can't forge. In front
 * of auibsal.org that is a Cloudflare edge, so the visitor is
 * CF-Connecting-IP; otherwise it is the connecting address itself. Only
 * hashed, never stored as is.
 */
export const visitorOf = (request: Request) => {
  const connecting =
    first(request.headers.get("x-real-ip")) ??
    first(request.headers.get("x-vercel-forwarded-for")) ??
    first(request.headers.get("x-forwarded-for"));
  const viaCloudflare = first(request.headers.get("cf-connecting-ip"));
  if (viaCloudflare && fromCloudflare(connecting)) {
    return viaCloudflare;
  }
  return connecting ?? "unknown";
};

/**
 * Whether a public form may take one more request from this visitor: at
 * most `max` per `windowSeconds` (ten minutes). Limits are set with AUIB's
 * campus network in mind, where many students share one address. The
 * count is kept in the database (core.take_rate). If the count can't be
 * read, ordinary forms go on (their own checks still run) and routes near
 * sign-in (`failClosed`) refuse.
 */
export const withinRateLimit = async (
  request: Request,
  form: string,
  {
    failClosed = false,
    key,
    max = 5,
    windowSeconds = 600,
  }: {
    failClosed?: boolean;
    /** Count by this instead of the visitor's address (an account id). */
    key?: string;
    max?: number;
    windowSeconds?: number;
  } = {}
): Promise<boolean> => {
  const bucket = createHash("sha256")
    .update(`${form}|${key ?? visitorOf(request)}`)
    .digest("hex");
  const { data, error } = await createAdminClient()
    .schema("core")
    .rpc("take_rate", {
      bucket,
      max_hits: max,
      window_seconds: windowSeconds,
    });
  if (error) {
    log.warn(`Rate limit not checked (${form}): ${error.message}`);
    return !failClosed;
  }
  return data !== false;
};
