import { readFile } from "node:fs/promises";
import path from "node:path";
import { authenticateCookies } from "@repo/auth/verify";

/**
 * The design system's files (packages/brand's stories, built into
 * apps/web/design by `bun run build:site`) at /diwan/media/design/kit (a
 * rewrite), for the Diwan's own design system page to draw its entries
 * with. Staff only, on the same sign-in as the rest of the site: the
 * browser loads these files itself, so the session comes from its cookies,
 * and for anyone else they are simply not there.
 */
const ROOT = path.resolve(process.cwd(), "design");
const SEGMENT = /^[\w-][\w.~-]*$/u;

const TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
};

const notFound = () =>
  new Response("Not found", {
    headers: { "Cache-Control": "no-store" },
    status: 404,
  });

type Session = NonNullable<Awaited<ReturnType<typeof authenticateCookies>>>;

const isStaff = async (session: Session) => {
  const { data, error } = await session.supabase
    .schema("membership")
    .rpc("my_membership");
  const row = Array.isArray(data) ? data[0] : data;
  return !error && row?.staff === true;
};

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) => {
  const parts = (await params).path;
  // Only plain file and folder names: no "..", no hidden files, no slashes.
  if (parts.length === 0 || !parts.every((part) => SEGMENT.test(part))) {
    return notFound();
  }
  const file = path.resolve(ROOT, ...parts);
  if (!file.startsWith(`${ROOT}${path.sep}`)) {
    return notFound();
  }
  const session = await authenticateCookies(request);
  if (!(session && (await isStaff(session)))) {
    return notFound();
  }
  try {
    const body = await readFile(file);
    return new Response(body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type":
          TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return notFound();
  }
};
