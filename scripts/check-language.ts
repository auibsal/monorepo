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
 * English (owner, Nov 7, 2026: the Chicago Manual of Style for prose,
 * sentence case for interface labels): American spelling, curly quotes and
 * apostrophes, "for example" over "e.g.", the ellipsis character, no
 * exclamation marks, no retired names and no retired document codes.
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

// Iraqi spellings and words (گ, چ and common colloquial words).
const IRAQI =
  /[گچ]|(^|[\s،.])(شلون|هسه|هسّه|ماكو|اكو|شكو|هواية|راح يـ|دا يـ|ليش|شنو)(?=$|[\s،.؟])/;

const ENGLISH: Rule[] = [
  // Chicago: curly quotes and apostrophes ("it’s", “a quote”).
  {
    pattern: /[A-Za-z]'[A-Za-z]|"/,
    why: "curly quotes and apostrophes (’ “ ”)",
  },
  { pattern: /\.\.\./, why: "the ellipsis character (…)" },
  { pattern: /\b(e\.g\.|i\.e\.)/, why: '"for example" or "that is"' },
  { pattern: /!/, why: "no exclamation marks" },
  {
    pattern:
      /\b(colour|centre|programmes?\b|cancelled|cancelling|organis|behaviour|catalogue|travelled|judgement|favourite|honour|theatre|licence|recognis|apologis|labelled|modelling|enrolment|analyse)/i,
    why: "American spelling",
  },
  // Owner, Nov 7, 2026 (decisions.md, "Retired names"): never use these.
  {
    pattern:
      /\b(the Salon|Book Circle|Open Pages|Listening Room|Launch Night|[Oo]pen nights?|[Ss]tation days?|Candidates’ Reading|the Ribbon|[Ww]orst-poem contest|Apprenticeships?|First Ink|[Tt]rial term|General Assembly|AGM|Qirtas Awards?|(Tabari|Jahiz|Nazik|Wasiti|Ibn al-Haytham) Award|Qirtas Prizes|[Cc]hapbook|Fellows?|Fellowship|Life Members?|Majlis|Munazara|Mutanabbi Friday|Bad Poetry Night|Open Stage|Scratch Night|Motion Night|Mutanabbi Walk|Productions|Gallery Wall|Month in Qirtas|Side Quest|BusTalks|Waraq|Nexus|Book of (Members|Fellows)|Charter (Night|Day)|Director of (the Company|Letters|Stage and Arts|Programs)|Editor of Qirtas|(Deputy )?Treasurer|Green Room|AUIB SAL HQ|Callboard|Program Leads?|[Ss]ix programs|Standing Programs?|[Ff]lagships?|the Evenings|the Specials|[Ww]eekly evenings?|[Ff]our-week cycle|[Ee]very fourth week)\b/,
    why: "a retired name",
  },
  // Document codes (owner, Nov 7, 2026): GOV, EXB, EVT, MEM, PTN, MED, ART
  // and EDT; the old families are retired everywhere.
  {
    pattern: /\bSAL-(POL|HBK|STR|PRP|BRD|PLT|QRT|CMP|OPS)-/,
    why: "a retired document code",
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
