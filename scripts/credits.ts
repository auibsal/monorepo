/**
 * /about/credits (decisions.md, The site): the software the site runs on,
 * with its licenses, generated from the workspaces' runtime dependencies.
 * `bun scripts/credits.ts` writes apps/web/lib/credits.json; `--check`
 * fails when it is out of date (CI), so the page never lags the code.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT = join(ROOT, "apps/web/lib/credits.json");
const WORKSPACES = [
  "apps/web",
  "packages/brand",
  "packages/config",
  "packages/database",
  "packages/email",
  "packages/internationalization",
];

interface Manifest {
  dependencies?: Record<string, string>;
  homepage?: string;
  license?: string | { type?: string };
  repository?: string | { url?: string };
}

const GITHUB = /github\.com[/:]([^/]+\/[^/.#]+)/u;
const SHORT = /^(?:github:)?([\w-]+\/[\w.-]+)$/u;

const read = (path: string): Manifest =>
  JSON.parse(readFileSync(path, "utf8")) as Manifest;

const repoUrl = (manifest: Manifest) => {
  const repo =
    typeof manifest.repository === "string"
      ? manifest.repository
      : manifest.repository?.url;
  if (manifest.homepage?.startsWith("https://")) {
    return manifest.homepage;
  }
  if (!repo) {
    return null;
  }
  const github = GITHUB.exec(repo)?.[1];
  if (github) {
    return `https://github.com/${github}`;
  }
  const short = SHORT.exec(repo)?.[1];
  return short ? `https://github.com/${short}` : null;
};

const names = new Set<string>();
for (const workspace of WORKSPACES) {
  for (const name of Object.keys(
    read(join(ROOT, workspace, "package.json")).dependencies ?? {}
  )) {
    if (!name.startsWith("@repo/")) {
      names.add(name);
    }
  }
}

const software = [...names].sort().map((name) => {
  const manifest = read(join(ROOT, "node_modules", name, "package.json"));
  const license =
    typeof manifest.license === "string"
      ? manifest.license
      : (manifest.license?.type ?? "See its repository");
  return { license, name, url: repoUrl(manifest) };
});

const credits = {
  fonts: [
    {
      license: "Ubuntu Font Licence 1.0",
      name: "Ubuntu",
      url: "https://design.ubuntu.com/font",
    },
    {
      license: "SIL Open Font License 1.1",
      name: "Markazi Text",
      url: "https://fonts.google.com/specimen/Markazi+Text",
    },
    {
      license: "SIL Open Font License 1.1",
      name: "Mrs Saint Delafield",
      url: "https://fonts.google.com/specimen/Mrs+Saint+Delafield",
    },
  ],
  icons: [{ license: "ISC", name: "Lucide", url: "https://lucide.dev" }],
  software,
};

const text = `${JSON.stringify(credits, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(OUT, "utf8") !== text) {
    console.error(
      "apps/web/lib/credits.json is out of date: run `bun scripts/credits.ts`."
    );
    process.exit(1);
  }
  console.log("Credits OK.");
} else {
  writeFileSync(OUT, text);
  console.log(`Credits: ${software.length} packages.`);
}
