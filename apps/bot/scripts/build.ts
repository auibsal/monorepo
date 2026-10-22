#!/usr/bin/env bun
/**
 * Builds the bot for Vercel's Build Output API: each function is one
 * minified ES module with its dependencies inlined (no node_modules to
 * trace or load at a cold start), next to its .vc-config.json.
 *
 *   bun run --cwd apps/bot build   →  .vercel/output
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BunPlugin } from "bun";

const root = join(import.meta.dir, "..");
const SERVER_ONLY = /^server-only$/;
const POLYFILLS = /^(node-fetch|abort-controller)$/;
const ANY = /.*/;
const output = join(root, ".vercel/output");

const functions = {
  cron: { maxDuration: 60 },
  setup: { maxDuration: 30 },
  telegram: { maxDuration: 30 },
} as const;

// `server-only` throws outside React's server build; here everything is
// server code.
const serverOnly: BunPlugin = {
  name: "server-only",
  setup(build) {
    build.onResolve({ filter: SERVER_ONLY }, () => ({
      namespace: "empty",
      path: "server-only",
    }));
    build.onLoad({ filter: ANY, namespace: "empty" }, () => ({
      contents: "export {};",
      loader: "js",
    }));
  },
};

// grammY's Node build brings node-fetch and abort-controller polyfills;
// Node 22 has both built in.
const nativeFetch: BunPlugin = {
  name: "native-fetch",
  setup(build) {
    build.onResolve({ filter: POLYFILLS }, (args) => ({
      namespace: "native",
      path: args.path,
    }));
    build.onLoad({ filter: ANY, namespace: "native" }, (args) => ({
      contents:
        args.path === "node-fetch"
          ? "module.exports = globalThis.fetch; module.exports.default = globalThis.fetch;"
          : "module.exports = { AbortController: globalThis.AbortController, AbortSignal: globalThis.AbortSignal };",
      loader: "js",
    }));
  },
};

await rm(output, { force: true, recursive: true });

for (const [name, options] of Object.entries(functions)) {
  const dir = join(output, "functions/api", `${name}.func`);
  // biome-ignore lint/performance/noAwaitInLoops: three small builds, in order
  const result = await globalThis.Bun.build({
    entrypoints: [join(root, "src/handlers", `${name}.ts`)],
    format: "esm",
    minify: true,
    naming: "index.mjs",
    outdir: dir,
    plugins: [serverOnly, nativeFetch],
    sourcemap: "linked",
    target: "node",
  });
  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }
  await writeFile(
    join(dir, ".vc-config.json"),
    JSON.stringify({
      handler: "index.mjs",
      launcherType: "Nodejs",
      maxDuration: options.maxDuration,
      runtime: "nodejs22.x",
      shouldAddHelpers: false,
      shouldAddSourcemapSupport: true,
    })
  );
  const size = result.outputs.find((o) => o.kind === "entry-point")?.size ?? 0;
  console.log(`api/${name}: ${(size / 1024).toFixed(0)} KB`);
}

await mkdir(output, { recursive: true });
await writeFile(
  join(output, "config.json"),
  JSON.stringify({
    routes: [{ handle: "filesystem" }, { dest: "/api/telegram", src: "/" }],
    version: 3,
  })
);
