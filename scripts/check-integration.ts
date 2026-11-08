#!/usr/bin/env bun
/**
 * Fails when an integration suite ran no tests: each one skips itself
 * without a local stack's keys, so a CI run that lost them would otherwise
 * pass having tested nothing. Reads Vitest's JSON report (the path given,
 * or integration.json).
 */
import { readFileSync } from "node:fs";
import { relative } from "node:path";

interface Report {
  testResults: {
    assertionResults: { status: string }[];
    name: string;
  }[];
}

const path = process.argv[2] ?? "integration.json";
const report = JSON.parse(readFileSync(path, "utf8")) as Report;
const problems = report.testResults.flatMap((file) => {
  const passed = file.assertionResults.filter((t) => t.status === "passed");
  const skipped = file.assertionResults.filter(
    (t) => t.status === "pending" || t.status === "skipped"
  );
  const name = relative(process.cwd(), file.name);
  if (passed.length === 0) {
    return [`${name}: no test ran`];
  }
  return skipped.length > 0 ? [`${name}: ${skipped.length} skipped`] : [];
});

if (report.testResults.length === 0) {
  problems.push("No integration suite was found.");
}
if (problems.length > 0) {
  console.error("Integration suites that did not run:");
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}
console.log(`Integration: ${report.testResults.length} suites ran every test.`);
