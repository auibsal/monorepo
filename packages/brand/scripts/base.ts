// Puts <base href="/brand/"> first in the built kit's two pages, so the
// relative paths Storybook and the stories write ("./sb-manager/…",
// "brand-kit/…") resolve under /brand, where the site serves the kit,
// whether the address ends in a slash or not. Run by `bun run build:site`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, base] = process.argv.slice(2);
if (!(dir && base)) {
  throw new Error("Usage: bun scripts/base.ts <build dir> <base href>");
}
for (const page of ["index.html", "iframe.html"]) {
  const file = join(dir, page);
  const html = readFileSync(file, "utf8");
  if (!html.includes("<base ")) {
    writeFileSync(
      file,
      html.replace("<head>", `<head>\n    <base href="${base}" />`)
    );
  }
}
