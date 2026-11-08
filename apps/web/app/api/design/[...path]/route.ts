import { readFile } from "node:fs/promises";
import path from "node:path";
import { authenticateCookies } from "@repo/auth/verify";

/**
 * The design system (packages/brand's Storybook, built into apps/web/design
 * by `bun run build:site`), served whole at /diwan/media/design (a rewrite;
 * the page itself, not framed) to staff only, on the
 * same sign-in as the rest of the site. The browser loads these files
 * itself, so the session comes from its cookies. Someone signed out who
 * opens the page goes to sign in and comes back; any other file is simply
 * not there for anyone but staff.
 */
const ROOT = path.resolve(process.cwd(), "design");
const SEGMENT = /^[\w-][\w.-]*$/u;

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

/** Where the page lives; its HTML takes it as the base for relative files. */
const PAGE = "/diwan/media/design";
const HEAD = /<head(\s[^>]*)?>/iu;

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
  const isHtml = path.extname(file).toLowerCase() === ".html";
  const lang =
    new URL(request.url).searchParams.get("lang") === "ar" ? "/ar" : "";
  const session = await authenticateCookies(request);
  if (!session) {
    if (isHtml && parts.length === 1 && parts[0] === "index.html") {
      const next = encodeURIComponent(`${lang}${PAGE}`);
      return Response.redirect(
        new URL(`${lang}/sign-in?next=${next}`, request.url),
        307
      );
    }
    return notFound();
  }
  if (!(await isStaff(session))) {
    return notFound();
  }
  try {
    const raw = await readFile(file);
    // Relative paths in Storybook's pages resolve under the page's address.
    const body = isHtml
      ? raw
          .toString("utf8")
          .replace(HEAD, (open) => `${open}<base href="${lang}${PAGE}/">`)
      : raw;
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
