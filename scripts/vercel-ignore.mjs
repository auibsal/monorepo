// Vercel's Ignored Build Step for every project in this repository
// (vercel.json → ignoreCommand). Exit 0 skips the build, 1 builds.
//
// Production only, until further notice (the owner's instruction): a preview
// (a pull request's or a branch's push) builds nothing. Production is
// built from main by the deploy hook once the migrations are applied
// (.github/workflows/migrate.yml), so it still builds.
//
// A commit whose subject line carries the skip marker ([skip ci] or
// [vercel skip]) builds nothing. Only the subject counts: a squash merge
// puts every commit body of the pull request into the message, and a body
// that merely mentions the marker must not skip a production build.
// Every other push builds every project. Skipping unaffected projects was
// tried with turbo-ignore (October 23, 2026): it compares against the
// previous deployment even when that one was skipped, so once a production
// build is skipped the changes before it never deploy. Vercel's own
// "skip unaffected projects" setting is the way to get that back, not a
// script.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping the build: previews are off; production only.");
  process.exit(0);
}

const message = execSync("git log -1 --pretty=%s", { encoding: "utf8" });
if (/\[(skip ci|vercel skip)\]/iu.test(message)) {
  console.log("Skipping the build: the commit message says so.");
  process.exit(0);
}
process.exit(1);
