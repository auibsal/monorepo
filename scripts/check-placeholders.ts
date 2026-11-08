#!/usr/bin/env bun
/**
 * Fails when a placeholder token (two braces around a capitalized name)
 * is left in a text file: copy that was never filled in.
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const TOKEN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "dist",
  "node_modules",
  "out",
  "storybook-static",
]);
const TEXT_EXTENSIONS = new Set([
  "",
  ".css",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".mjs",
  ".mts",
  ".plist",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);

const listFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return IGNORED_DIRECTORIES.has(entry.name) ? [] : listFiles(path);
      }
      return TEXT_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    })
  );
  return nested.flat();
};

const files = await listFiles(root);
const findings: string[] = [];

for (const path of files) {
  const file = relative(root, path);
  // biome-ignore lint/performance/noAwaitInLoops: sequential IO keeps memory flat
  const content = await readFile(path, "utf8");

  for (const [line, text] of content.split("\n").entries()) {
    for (const match of text.matchAll(TOKEN)) {
      findings.push(`${file}:${line + 1}: {{${match[1]}}}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Unfilled placeholder tokens (replace them with the text):");
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}

console.log(`No placeholder tokens left (${files.length} files checked).`);
