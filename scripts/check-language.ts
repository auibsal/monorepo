#!/usr/bin/env bun
/**
 * Checks the platform's copy against the language standard (Guide → Voice,
 * "Language standard"; decisions.md). It reads the messages files,
 * the email copy and Hudhud's copy.
 *
 *   bun run check:i18n   (runs this after check-i18n.ts)
 *
 * Arabic (decisions.md, Language; the fourth prompt, 7f): tanween
 * al-fath on the letter before the alif (ـًا, not ـاً) and no other tanween
 * (no ٌ or ٍ), no tatweel, Latin digits, the Iraqi month names the ar-IQ
 * formatter uses, Arabic punctuation (، ؛ ؟) and «» quotes, taa marbuta and
 * alif maqsura only at a word's end, hamzat al-wasl on the derived nouns,
 * AUIB's name in its compounds, Latin addresses isolated (⁦…⁩, or <bdi>)
 * so they read left to right, and Iraqi Arabic only in Hudhud.
 * English (decisions.md: the Chicago Manual of Style for prose,
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
  // Supabase's auth emails (audit D4).
  ...[
    "confirmation",
    "email_change",
    "email_changed_notification",
    "magic_link",
    "mfa_factor_enrolled_notification",
    "mfa_factor_unenrolled_notification",
    "password_changed_notification",
    "recovery",
  ].map((name) => `packages/database/supabase/templates/${name}.html`),
  "packages/database/supabase/templates/subjects.txt",
];
// The one place Iraqi Arabic is written (decisions, Nov 4, 2026).
const IRAQI_HOME = "apps/web/lib/api/bot/copy.ts";

interface Rule {
  pattern: RegExp;
  why: string;
}

const ARABIC: Rule[] = [
  {
    pattern: /[ء-ي]ّ?اً/u,
    why: "tanween goes on the letter before the alif (ـًا)",
  },
  { pattern: /[٠-٩۰-۹]/u, why: "Latin digits (0-9), as the formatter writes" },
  {
    pattern:
      /(يناير|فبراير|أبريل|إبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/u,
    why: "Iraqi month names (كانون الثاني … كانون الأول), as ar-IQ formats dates",
  },
  {
    pattern: /[ء-ي][,;?]|[,;?] ?[ء-ي]/u,
    why: "Arabic punctuation: ، ؛ ؟",
  },
  { pattern: /[ء-ي][^\n]*[“”]|[“”][^\n]*[ء-ي]/u, why: "«» quotes in Arabic" },
  // decisions.md, Retired names: «أمين السر», never «الأمين العام»; Events
  // is «الفعاليات».
  {
    pattern: /الأمين العام|الأمينة العامة|«ما يجري»|المحطة القادمة/u,
    why: "a retired name (the glossary)",
  },
  // Tanween is written only as al-fath (ـًا); never ٌ or ٍ.
  { pattern: /[\u064C\u064D]/u, why: "no tanween but al-fath (no ٌ or ٍ)" },
  { pattern: /\u0640/u, why: "no tatweel (ـ): rephrase, as بالنطاق or ضمن" },
  // Taa marbuta and alif maqsura end a word.
  {
    pattern: /[ةى][\u0621-\u063A\u0641-\u064A]/u,
    why: "taa marbuta (ة) and alif maqsura (ى) only at a word's end",
  },
  // Hamzat al-wasl: the derived nouns of forms VII, VIII and X take a bare
  // alif (استمارة, اجتماع), never إ.
  {
    pattern:
      /(^|[\s«(،])(إستمارة|إجتماع|إنتخاب|إستخدام|إشتراك|إنضمام|إختيار|إستلام|إنتهاء|إبتداء|إستقالة|إستثناء|إجتهاد|إقتراح|إنسحاب|إستعادة)/u,
    why: "hamzat al-wasl: a bare alif (استمارة, اجتماع), not إ",
  },
  // decisions.md, Language: AUIB inside a compound is «الجامعة الأمريكية»;
  // alone it is «الجامعة الأمريكية في بغداد», never «… في العراق».
  {
    pattern:
      /(جمعية الفنون والآداب|صحيفة) (في )?الجامعة الأمريكية في بغداد|الجامعة الأمريكية في العراق|(صحيفة|جريدة) الجامعة للأخبار/u,
    why: "AUIB's Arabic name: «الجامعة الأمريكية» inside a compound (the glossary)",
  },
];

/** A web or email address in Arabic text, not already isolated. */
const BARE_ADDRESS =
  /(?<![\u2066\w@./="':>-])(https?:\/\/|[\w.+-]+@[\w-]+\.|[\w-]+\.(org|edu\.iq|com)\b)/u;

// Iraqi spellings and words (گ, چ, پ and common colloquial words).
const IRAQI =
  /[گچپ]|(^|[\s،.])(شلون|هسه|هسّه|ماكو|اكو|شكو|هواية|راح يـ|دا يـ|ليش|شنو)(?=$|[\s،.؟])/u;

const ENGLISH: Rule[] = [
  // Chicago: curly quotes and apostrophes ("it’s", “a quote”).
  {
    pattern: /[A-Za-z]'[A-Za-z]|"/u,
    why: "curly quotes and apostrophes (’ “ ”)",
  },
  { pattern: /\.\.\./u, why: "the ellipsis character (…)" },
  { pattern: /\b(e\.g\.|i\.e\.)/u, why: '"for example" or "that is"' },
  { pattern: /!/u, why: "no exclamation marks" },
  {
    pattern:
      /\b(colour|centre|programmes?\b|cancelled|cancelling|organis|behaviour|catalogue|travelled|judgement|favourite|honour|theatre|licence|recognis|apologis|labelled|modelling|enrolment|analyse)/iu,
    why: "American spelling",
  },
  // Owner, Nov 7, 2026 (decisions.md, "Retired names"): never use these.
  {
    pattern:
      /\b(the Salon|Book Circle|Open Pages|Listening Room|Launch Night|[Oo]pen nights?|[Ss]tation days?|Candidates’ Reading|the Ribbon|[Ww]orst-poem contest|Apprenticeships?|First Ink|[Tt]rial term|General Assembly|AGM|Qirtas Awards?|(Tabari|Jahiz|Nazik|Wasiti|Ibn al-Haytham) Award|Qirtas Prizes|[Cc]hapbook|Fellows?|Fellowship|Life Members?|Majlis|Munazara|Mutanabbi Friday|Bad Poetry Night|Open Stage|Scratch Night|Motion Night|Mutanabbi Walk|Productions|Gallery Wall|Month in Qirtas|Side Quest|BusTalks|Waraq|Nexus|Book of (Members|Fellows)|Charter (Night|Day)|Director of (the Company|Letters|Stage and Arts|Programs)|Editor of Qirtas|(Deputy )?Treasurer|Green Room|AUIB SAL HQ|Callboard|Program Leads?|Salon|[Ll]edgers?|[Rr]otas?|[Bb]ook votes?|[Pp]rompt cards?|[Ss]ix programs|Standing Programs?|[Ff]lagships?|the Evenings|the Specials|[Ww]eekly evenings?|[Ff]our-week cycle|[Ee]very fourth week|Arts and Sciences College|What[’']s on|General Secretary|Acting President|Submissions Manager|Event Coordinator|Venues and Logistics Lead|Production Lead|Event Staff|Arabic Editor|Onboarding Lead|Records and Recognition Lead|Technical Administrator|Founders[’'] Roll|Honorary Fellows?|[Pp]aperless pledge|Ubuntu Arabic|Issue 1|[Pp]ilot issue|printed year-in-review)\b/u,
    why: "a retired name",
  },
  // Document codes (decisions.md): GOV, EXB, EVT, MEM, PTN, MED, ART
  // and EDT; the old families are retired everywhere.
  {
    pattern: /\bSAL-(POL|HBK|STR|PRP|BRD|PLT|QRT|CMP|OPS)-/u,
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

const isolated = (where: string, text: string) => {
  if (HAS_ARABIC.test(text) && BARE_ADDRESS.test(text)) {
    findings.push(
      `${where}: a Latin address in Arabic text is isolated (⁦…⁩ or <bdi>)\n    ${text.slice(0, 120)}`
    );
  }
};

const HAS_ARABIC = /[ء-ي]/u;
for (const [key, value] of await readMessages("ar")) {
  check(`ar.json ${key}`, value, ARABIC);
  isolated(`ar.json ${key}`, value);
  if (IRAQI.test(value)) {
    findings.push(
      `ar.json ${key}: standard Arabic on the site (Iraqi only in Hudhud)\n    ${value.slice(0, 120)}`
    );
  }
}
for (const [key, value] of await readMessages("en")) {
  check(`en.json ${key}`, value, ENGLISH);
}

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
    isolated(`${file}:${index + 1}`, line);
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
