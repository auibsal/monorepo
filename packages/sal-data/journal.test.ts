import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  averageTotal,
  band,
  canEditorMove,
  categories,
  closedCategories,
  criteria,
  deskCategories,
  deskOf,
  desks,
  editionDesks,
  editorMoves,
  isSixWords,
  needsThirdRead,
  newsroomDesks,
  readingMinutes,
  rubric,
  rubricTotal,
  scoreSchema,
  sectionTypes,
  sendableCategories,
  submissionObjectPath,
  submissionSchema,
  typeNeeds,
  wordCount,
  youtubeId,
} from "./journal";

const TRANSITION_PAIR =
  /\(\s*\x27([a-z_]+)\x27(?:::journal\.submission_status)?,\s*\x27([a-z_]+)\x27(?:::journal\.submission_status)?\)/g;
const RANDOM_PDF_PATH = /^abc\/[0-9a-f-]{36}\.pdf$/;
const migrations = join(
  import.meta.dirname,
  "..",
  "database",
  "supabase",
  "migrations"
);
const sectionsSql = readFileSync(
  join(migrations, "20261029000300_qirtas_six_sections.sql"),
  "utf8"
);
const journalSql = readFileSync(
  join(
    migrations,
    readdirSync(migrations).find((f) => f.endsWith("_journal.sql")) ?? ""
  ),
  "utf8"
);

describe("six sections, six types each", () => {
  test("the forms list the thirty-six types of journal.is_current_category()", () => {
    expect(desks).toEqual([
      "news",
      "voices",
      "letters",
      "gallery",
      "video",
      "games",
    ]);
    for (const desk of desks) {
      expect(deskCategories(desk), desk).toHaveLength(6);
    }
    expect(categories).toHaveLength(36);
    for (const category of categories) {
      expect(sectionsSql).toContain(`'${category}'`);
      expect(deskOf(category)).toBe(
        desks.find((d) =>
          (sectionTypes[d] as readonly string[]).includes(category)
        )
      );
    }
    expect(deskOf("review")).toBe("voices");
  });
});

describe("the types members send", () => {
  test("everything but Six Words; two doors", () => {
    expect(sendableCategories("letters")).toEqual([
      "poetry",
      "fiction",
      "creative_nonfiction",
      "drama",
      "translation",
    ]);
    expect(sendableCategories("games")).toHaveLength(6);
    expect(closedCategories).toEqual(["six_words"]);
    expect(newsroomDesks).toEqual(["news", "voices", "video", "games"]);
    expect(editionDesks).toEqual(["letters", "gallery"]);
  });
});

describe("rubric v2", () => {
  test("limits match the database check constraints", () => {
    for (const key of criteria) {
      expect(journalSql).toContain(
        `${key} smallint not null check (${key} between ${rubric[key].min} and ${rubric[key].max})`
      );
    }
  });

  test("weights match the generated total column", () => {
    const formula = criteria
      .map((key) => `${key} * ${rubric[key].weight / rubric[key].max}`)
      .join(" + ");
    expect(journalSql.replace(/\s+/g, " ")).toContain(formula);
    expect(criteria.reduce((sum, key) => sum + rubric[key].weight, 0)).toBe(
      100
    );
  });

  test("the zod schema rejects out-of-range scores", () => {
    const valid = { archive_factor: 3, craft: 3, depth: 3, voice: 3 };
    expect(scoreSchema.safeParse(valid).success).toBe(true);
    expect(scoreSchema.safeParse({ ...valid, craft: 6 }).success).toBe(false);
    expect(scoreSchema.safeParse({ ...valid, voice: 0 }).success).toBe(false);
    expect(scoreSchema.safeParse({ ...valid, depth: 2.5 }).success).toBe(false);
  });

  test("totals, bands and the third-read rule", () => {
    expect(
      rubricTotal({ archive_factor: 5, craft: 5, depth: 5, voice: 5 })
    ).toBe(100);
    expect(
      rubricTotal({ archive_factor: 1, craft: 1, depth: 1, voice: 1 })
    ).toBe(20);
    expect(band(80)).toBe("strong");
    expect(band(65)).toBe("consider");
    expect(band(64)).toBe("decline");
    expect(needsThirdRead(80, 60)).toBe(false);
    expect(needsThirdRead(81, 60)).toBe(true);
  });
});

describe("submission form", () => {
  const base = {
    call_id: "00000000-0000-4000-8000-000000000001",
    first_publication_confirmed: true,
    human_authorship_confirmed: true as const,
    language: "en" as const,
    title: "Firsts",
  };

  test("one door: every section may name a call or leave it to the standing call", () => {
    expect(deskOf("poetry")).toBe("letters");
    expect(deskOf("comic")).toBe("gallery");
    expect(deskOf("interview")).toBe("news");
    expect(
      submissionSchema.safeParse({ ...base, category: "report" }).success
    ).toBe(true);
    const { call_id: _call, ...noCall } = base;
    expect(
      submissionSchema.safeParse({ ...noCall, category: "report" }).success
    ).toBe(true);
    expect(
      submissionSchema.safeParse({ ...noCall, category: "poetry" }).success
    ).toBe(true);
  });

  test("Gallery work needs consent; video needs its link", () => {
    expect(
      submissionSchema.safeParse({ ...base, category: "comic" }).success
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...base,
        category: "comic",
        consent_confirmed: true,
      }).success
    ).toBe(true);
    const { call_id: _call, ...noCall } = base;
    expect(
      submissionSchema.safeParse({ ...noCall, category: "reel" }).success
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...noCall,
        category: "reel",
        video_url: "https://youtu.be/x",
      }).success
    ).toBe(true);
  });

  test("the desk mapping matches journal.desk_of()", () => {
    const fn = sectionsSql.slice(
      sectionsSql.indexOf("create or replace function journal.desk_of"),
      sectionsSql.indexOf("create function journal.is_current_category")
    );
    for (const category of categories) {
      const desk = deskOf(category);
      if (desk !== "letters") {
        expect(fn, category).toMatch(
          new RegExp(`'${category}'[^)]*\\)\\s*then '${desk}'`)
        );
      }
    }
  });

  test("a translation needs its source and a rights note", () => {
    expect(
      submissionSchema.safeParse({ ...base, category: "translation" }).success
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...base,
        category: "translation",
        rights_note: "PD",
        source_text: "x",
      }).success
    ).toBe(true);
  });

  test("the Human Authorship pledge is required", () => {
    expect(
      submissionSchema.safeParse({
        ...base,
        category: "poetry",
        human_authorship_confirmed: false,
      }).success
    ).toBe(false);
  });

  test("files get random names under the submission folder", () => {
    const path = submissionObjectPath("abc", "application/pdf");
    expect(path).toMatch(RANDOM_PDF_PATH);
    expect(path).not.toBe(submissionObjectPath("abc", "application/pdf"));
  });
});

describe("the board", () => {
  test("every editor move is a transition the database allows", () => {
    const allowed = new Set(
      [...journalSql.matchAll(TRANSITION_PAIR)].map(([, a, b]) => `${a}>${b}`)
    );
    for (const [from, targets] of Object.entries(editorMoves)) {
      for (const to of targets ?? []) {
        expect(allowed.has(`${from}>${to}`), `${from} → ${to}`).toBe(true);
      }
    }
  });

  test("editors cannot run intake or decide by dragging", () => {
    expect(canEditorMove("received", "intake_check")).toBe(false);
    expect(canEditorMove("selection", "accepted")).toBe(false);
    expect(canEditorMove("in_review", "selection")).toBe(true);
  });

  test("averages ignore reads not yet scored", () => {
    expect(averageTotal([])).toBeNull();
    expect(averageTotal([null, undefined])).toBeNull();
    expect(averageTotal([80, null, 71])).toBe(75.5);
  });
});

describe("Waraq helpers", () => {
  test("six words, punctuation aside", () => {
    expect(isSixWords("For sale: baby shoes, never worn.")).toBe(true);
    expect(isSixWords("Too few words here.")).toBe(false);
    expect(isSixWords("بيت قديم وباب مفتوح وذاكرة باقية")).toBe(true);
  });

  test("what each type needs mirrors the publish rule", () => {
    expect(typeNeeds("report")).toEqual({
      deck: true,
      media: false,
      text: true,
      video: false,
    });
    expect(typeNeeds("comic").media).toBe(true);
    expect(typeNeeds("reel")).toMatchObject({ text: false, video: true });
    expect(sectionsSql).toContain(
      "p.category in ('report', 'feature', 'interview')"
    );
  });

  test("reading time and YouTube links", () => {
    expect(readingMinutes("<p>word</p>")).toBe(1);
    expect(wordCount("<p>one two</p><p>three</p>")).toBe(3);
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(youtubeId("https://vimeo.com/1")).toBeNull();
  });
});
