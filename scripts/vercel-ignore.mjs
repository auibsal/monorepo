// Vercel's Ignored Build Step for every project in this repository
// (vercel.json → ignoreCommand). Exit 0 skips the build, 1 builds.
//
// A commit whose subject line carries the skip marker ([skip ci] or
// [vercel skip]) builds nothing. Only the subject counts: a squash merge
// puts every commit body of the pull request into the message, and a body
// that merely mentions the marker must not skip a production build.
// Otherwise the app is built only when something it depends on changed
// since the last deployment (turbo-ignore walks the workspace graph).
import { execSync, spawnSync } from "node:child_process";

const [, , app] = process.argv;
if (!app) {
  console.error("Usage: node scripts/vercel-ignore.mjs <workspace>");
  process.exit(1);
}

const message = execSync("git log -1 --pretty=%s", { encoding: "utf8" });
if (/\[(skip ci|vercel skip)\]/i.test(message)) {
  console.log("Skipping the build: the commit message says so.");
  process.exit(0);
}

const result = spawnSync("npx", ["--yes", "turbo-ignore", app], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});
// turbo-ignore: 0 = nothing changed (skip), 1 = changed (build). Anything
// else is a failure of the check itself; build rather than guess.
process.exit(result.status === 0 ? 0 : 1);
