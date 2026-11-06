#!/usr/bin/env bun
/**
 * Checks the platform's copy against the language standard (Guide → Voice,
 * "Language standard"; owner, Nov 4, 2026). It reads the messages files,
 * the email copy and Hudhud's copy.
 *
 *   bun run check:i18n   (runs this after check-i18n.ts)
 *
 * Arabic: tanween on the letter before the alif (ـًا, not ـاً), Latin
 * digits, the Iraqi month names the ar-IQ formatter uses, Arabic
 * punctuation (، ؛ ؟) and «» quotes, and Iraqi Arabic only in Hudhud.
 * English: American spelling (Chicago, with Merriam-Webster; owner, Nov
 * 6, 2026, so curly quotes are welcome in prose), "for example" over
 * "e.g.", the ellipsis character, no exclamation marks and no retired
 * names.
 */
import { readFile } from "node:fs/promises";

const MESSAGES = "packages/internationalization/messages";
// Arabic in these files is checked line by line (they mix both languages).
const COPY_FILES = [
  "packages/email/copy.ts",
  "apps/web/lib/api/outbox.ts",
  "apps/web/lib/api/bot/copy.ts",
];
// The one place Iraqi Arabic is written (decisions, Nov 4, 2026).
const IRAQI_HOME = "apps/web/lib/api/bot/copy.ts";

interface Rule {
  pattern: RegExp;
  why: string;
}

const ARABIC: Rule[] = [
  {
    pattern: /[ء-ي]ّ?اً/,
    why: "tanween goes on the letter before the alif (ـًا)",
  },
  { pattern: /[٠-٩۰-۹]/, why: "Latin digits (0-9), as the formatter writes" },
  {
    pattern:
      /(يناير|فبراير|أبريل|إبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/,
    why: "Iraqi month names (كانون الثاني … كانون الأول), as ar-IQ formats dates",
  },
  {
    pattern: /[ء-ي][,;?]|[,;?] ?[ء-ي]/,
    why: "Arabic punctuation: ، ؛ ؟",
  },
  { pattern: /[ء-ي][^\n]*[“”]|[“”][^\n]*[ء-ي]/, why: "«» quotes in Arabic" },
];

// Iraqi spellings and words (گ, چ, پ and common colloquial words).
const IRAQI =
  /[گچپ]|(^|[\s،.])(شلون|هسه|هسّه|ماكو|اكو|شكو|هواية|راح يـ|دا يـ|ليش|شنو)(?=$|[\s،.؟])/;

const ENGLISH: Rule[] = [
  { pattern: /\.\.\./, why: "the ellipsis character (…)" },
  { pattern: /\b(e\.g\.|i\.e\.)/, why: '"for example" or "that is"' },
  { pattern: /!/, why: "no exclamation marks" },
  {
    pattern:
      /\b(colour|centre|programmes?\b|cancelled|cancelling|organis|behaviour|catalogue|travelled|judgement|favourite|honour|theatre|licence|recognis|apologis|labelled|modelling|enrolment|analyse)/i,
    why: "American spelling",
  },
  {
    pattern:
      /\b(Waraq|Nexus|Qirtas Prizes?|Majlis|Book of Members|Book of Fellows|Charter Night|Callboard|Gallery Wall|Open Stage|Month in Qirtas|Green Room)\b/,
    why: "a retired name",
  },
  // Owner, Nov 5, 2026: no programs, and the Council of six.
  {
    pattern:
      /\b(Director of (Programs|Events|Partnerships|Membership)|Program Leads?|[Ss]ix programs|Standing Programs?|[Ff]lagships?|the Evenings|the Specials|[Ww]eekly evenings?|[Ff]our-week cycle|[Ee]very fourth week)\b/,
    why: "a retired name",
  },
];

type Entry = [key: string, value: string];

const flatten = (value: unknown, prefix = ""): Entry[] =>
  typeof value === "string"
    ? [[prefix, value]]
    : Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
        flatten(v, prefix ? `${prefix}.${k}` : k)
      );

const readMessages = async (locale: string) =>
  flatten(JSON.parse(await readFile(`${MESSAGES}/${locale}.json`, "utf8")));

const findings: string[] = [];
const check = (where: string, text: string, rules: Rule[]) => {
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      findings.push(`${where}: ${rule.why}\n    ${text.slice(0, 120)}`);
    }
  }
};

for (const [key, value] of await readMessages("ar")) {
  check(`ar.json ${key}`, value, ARABIC);
  if (IRAQI.test(value)) {
    findings.push(
      `ar.json ${key}: standard Arabic on the site (Iraqi only in Hudhud)\n    ${value.slice(0, 120)}`
    );
  }
}
for (const [key, value] of await readMessages("en")) {
  check(`en.json ${key}`, value, ENGLISH);
}

const HAS_ARABIC = /[ء-ي]/;
const copies = await Promise.all(
  COPY_FILES.map(async (file) => ({
    file,
    lines: (await readFile(file, "utf8")).split("\n"),
  }))
);
for (const { file, lines } of copies) {
  for (const [index, line] of lines.entries()) {
    if (!HAS_ARABIC.test(line) || line.includes("language-ignore")) {
      continue;
    }
    check(`${file}:${index + 1}`, line, ARABIC);
    if (file !== IRAQI_HOME && IRAQI.test(line)) {
      findings.push(
        `${file}:${index + 1}: standard Arabic here (Iraqi only in Hudhud)\n    ${line.trim().slice(0, 120)}`
      );
    }
  }
}

if (findings.length > 0) {
  console.error(
    `${findings.length} line(s) break the language standard (packages/brand/guide/12-voice.md):\n`
  );
  console.error(findings.join("\n"));
  process.exit(1);
}
console.log("Language: every line follows the standard.");
