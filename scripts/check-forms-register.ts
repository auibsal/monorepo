/**
 * The forms register check (decisions.md; decisions §6, "One source
 * for every form, letter, card and certificate"): the register in
 * SAL-EXB-01 (the Leadership Handbook, in Notion's Documents) is the one
 * source of every form's number, title, fields and wording. This compares
 * the site with it:
 *
 * - every register entry (F-01 to F-45, F-22 removed) is a row of
 *   `governance.form_types` with the same code and title, and no row is
 *   missing from the register;
 * - a form the register says is filled at auibsal.org/forms/F-xx is a site
 *   form (`@repo/sal-data/forms`), and no other is;
 * - each site form's field phrases (`registerFields`) appear in its entry.
 *
 * Reads Notion with NOTION_TOKEN and the database's Data API with
 * SUPABASE_URL and SUPABASE_SECRET_KEY (CI: the local stack after the
 * migrations). Without NOTION_TOKEN it says so and skips; with
 * REQUIRE_FORMS_REGISTER=1 a missing token fails.
 */
import { formKeys, registerFields } from "../packages/sal-data/forms";

const NOTION = "https://api.notion.com/v1";
const VERSION = "2026-03-11";
const CODE = "SAL-EXB-01";
const ENTRY = /^SAL-EXB-01 · (F-\d{2})\s*(.*?)\s*(?:·|$)/;
const SINGLE_QUOTES = /[‘’]/g;
const DOUBLE_QUOTES = /[“”]/g;
const SPACES = /\s+/g;

interface Block {
  has_children?: boolean;
  id: string;
  type: string;
  [key: string]: unknown;
}
interface Page {
  has_more: boolean;
  next_cursor: string | null;
  results: Block[];
}
interface Entry {
  text: string;
  title: string;
}
interface FormType {
  code: string;
  filled: string;
  key: string;
  title_en: string;
}

const token = process.env.NOTION_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SECRET_KEY;

const normalize = (text: string) =>
  text
    .replaceAll(SINGLE_QUOTES, "'")
    .replaceAll(DOUBLE_QUOTES, '"')
    .replaceAll(SPACES, " ")
    .toLowerCase();

const notion = async <T>(path: string, body?: object): Promise<T> => {
  const response = await fetch(`${NOTION}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "notion-version": VERSION,
    },
    method: body ? "POST" : "GET",
  });
  if (!response.ok) {
    throw new Error(
      `Notion ${path}: ${response.status} ${await response.text()}`
    );
  }
  return (await response.json()) as T;
};

/** A table of the database, through the Data API, with the secret key. */
const rest = async <T>(schema: string, query: string): Promise<T> => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
    headers: {
      "accept-profile": schema,
      apikey: secret ?? "",
      authorization: `Bearer ${secret}`,
    },
  });
  if (!response.ok) {
    throw new Error(`${schema}.${query}: ${response.status}`);
  }
  return (await response.json()) as T;
};

const children = async (id: string, cursor?: string): Promise<Block[]> => {
  const page = await notion<Page>(
    `/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`
  );
  const rest_ =
    page.has_more && page.next_cursor
      ? await children(id, page.next_cursor)
      : [];
  return [...page.results, ...rest_];
};

const textOf = (block: Block) => {
  const value = block[block.type] as
    | { rich_text?: { plain_text: string }[] }
    | undefined;
  return (value?.rich_text ?? []).map((r) => r.plain_text).join("");
};

/** All the text under a block, its children's included. */
const deepText = async (block: Block): Promise<string> => {
  if (!block.has_children) {
    return textOf(block);
  }
  const parts = await Promise.all((await children(block.id)).map(deepText));
  return [textOf(block), ...parts].join("\n");
};

/** Every toggle in the page, however deep. */
const toggles = async (id: string): Promise<Block[]> => {
  const blocks = await children(id);
  const nested = await Promise.all(
    blocks
      .filter((b) => b.type !== "toggle" && b.has_children)
      .map((b) => toggles(b.id))
  );
  return [...blocks.filter((b) => b.type === "toggle"), ...nested.flat()];
};

/** The register: each entry's title and all its text, by code. */
const readRegister = async () => {
  const [setting] = await rest<{ value: { documents?: string } }[]>(
    "core",
    "settings?key=eq.notion.data_sources&select=value"
  );
  const documents = setting?.value.documents;
  if (!documents) {
    throw new Error("No Documents data source in core.settings.");
  }
  const rows = await notion<{ results: { id: string }[] }>(
    `/data_sources/${documents}/query`,
    {
      filter: {
        and: [
          { property: "Code", rich_text: { equals: CODE } },
          { property: "Language", select: { equals: "English" } },
        ],
      },
    }
  );
  const [handbook] = rows.results;
  if (!handbook) {
    throw new Error(`No English ${CODE} row in Notion's Documents.`);
  }
  const entries = await Promise.all(
    (await toggles(handbook.id)).map(async (block) => {
      const match = ENTRY.exec(textOf(block));
      return match
        ? ([
            match[1] ?? "",
            {
              text: normalize(await deepText(block)),
              title: (match[2] ?? "").trim(),
            },
          ] as const)
        : null;
    })
  );
  return new Map(entries.filter((e) => e !== null));
};

/** What differs between one form type and its register entry. */
const typeProblems = (type: FormType, entry: Entry | undefined) => {
  if (!entry) {
    return [`${type.code} is on the site but not in the register.`];
  }
  if (type.filled === "removed") {
    return [];
  }
  const problems: string[] = [];
  if (entry.title !== type.title_en) {
    problems.push(
      `${type.code}: the register says "${entry.title}", the site "${type.title_en}".`
    );
  }
  const onSite = entry.text.includes(
    normalize(`auibsal.org/forms/${type.code}`)
  );
  if (onSite !== (type.filled === "site")) {
    problems.push(
      `${type.code}: the register ${onSite ? "fills it" : "doesn't fill it"} at /forms/${type.code}; the site has it as "${type.filled}".`
    );
  }
  if (onSite !== (formKeys as readonly string[]).includes(type.key)) {
    problems.push(
      `${type.code}: ${onSite ? "missing from" : "should not be in"} @repo/sal-data/forms.`
    );
  }
  return problems;
};

/** Field phrases a site form keeps that its register entry no longer has. */
const fieldProblems = (register: Map<string, Entry>) =>
  formKeys.flatMap((key) => {
    const code = `F-${key.slice(1)}`;
    const entry = register.get(code);
    return registerFields[key]
      .filter((phrase) => entry && !entry.text.includes(normalize(phrase)))
      .map((phrase) => `${code}: the register no longer asks for "${phrase}".`);
  });

const main = async () => {
  if (!token) {
    const message =
      "Forms register: NOTION_TOKEN is not set, so the register was not compared.";
    if (process.env.REQUIRE_FORMS_REGISTER === "1") {
      console.error(message);
      process.exit(1);
    }
    console.warn(`${message} Skipped.`);
    return;
  }
  if (!(supabaseUrl && secret)) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }
  const [register, types] = await Promise.all([
    readRegister(),
    rest<FormType[]>(
      "governance",
      "form_types?select=key,code,title_en,filled"
    ),
  ]);
  const codes = new Set(types.map((t) => t.code));
  const problems = [
    ...types.flatMap((type) => typeProblems(type, register.get(type.code))),
    ...[...register.keys()]
      .filter((code) => !codes.has(code))
      .map((code) => `${code} is in the register but not on the site.`),
    ...fieldProblems(register),
  ];
  if (problems.length > 0) {
    console.error(
      `The site's forms differ from the register (${CODE}):\n${problems.map((p) => `- ${p}`).join("\n")}`
    );
    process.exit(1);
  }
  console.log(
    `Forms register: ${register.size} entries match the site (${formKeys.length} filled on the site).`
  );
};

await main();
