/**
 * The agreements and consents check (decisions.md, Documents and forms:
 * "One source: the site's list of agreements and consents matches the
 * handbook exactly, and CI checks it"). The register "Agreements and
 * consents" in SAL-EXB-01 (the Leadership Handbook, in Notion's Documents)
 * holds only what people sign, by name, one toggle each, headed
 * "<name> · <Title>" ("media-release · Media release"). Templates and
 * records (letters, notices, minutes, score sheets, reports, lists and
 * checklists) are in the templates index, not compared here. This compares
 * the site with the register:
 *
 * - every register kind in `governance.form_types` (`in_register`) has an
 *   entry with the same name and title, and every entry is a register kind
 *   on the site;
 * - each kind signed on the site keeps the field phrases (`registerFields`)
 *   its entry has.
 *
 * Reads Notion with NOTION_TOKEN and the database's Data API with
 * SUPABASE_URL and SUPABASE_SECRET_KEY (CI: the local stack after the
 * migrations). Without NOTION_TOKEN it says so and skips; with
 * REQUIRE_FORMS_REGISTER=1 a missing token fails.
 */
import {
  formKeys,
  registerFields,
  registerKinds,
} from "../apps/web/lib/data/forms";

const NOTION = "https://api.notion.com/v1";
const VERSION = "2026-03-11";
const CODE = "SAL-EXB-01";
const ENTRY = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\s*·\s*(.*?)\s*(?:·|$)/u;
const SINGLE_QUOTES = /[‘’]/gu;
const DOUBLE_QUOTES = /[“”]/gu;
const SPACES = /\s+/gu;

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

/** The register: each entry's title and all its text, by name. */
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

/** What differs between one kind and its register entry. */
const typeProblems = (type: FormType, entry: Entry | undefined) => {
  if (!entry) {
    return [`${type.key} is on the site but not in the register.`];
  }
  return entry.title === type.title_en
    ? []
    : [
        `${type.key}: the register says "${entry.title}", the site "${type.title_en}".`,
      ];
};

/** Field phrases a site form keeps that its register entry no longer has. */
const fieldProblems = (register: Map<string, Entry>) =>
  formKeys
    .filter((key) => (registerKinds as readonly string[]).includes(key))
    .flatMap((key) => {
      const entry = register.get(key);
      return registerFields[key]
        .filter((phrase) => entry && !entry.text.includes(normalize(phrase)))
        .map(
          (phrase) => `${key}: the register no longer asks for "${phrase}".`
        );
    });

const main = async () => {
  if (!token) {
    const message =
      "Agreements and consents: NOTION_TOKEN is not set, so the register was not compared.";
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
      "form_types?select=key,title_en&in_register=is.true"
    ),
  ]);
  const names = new Set(types.map((t) => t.key));
  const listed = new Set<string>(registerKinds);
  const problems = [
    // The 13 kinds people sign (decisions.md, Documents and forms): the
    // site's list, the database's and the register are one list.
    ...registerKinds
      .filter((name) => !names.has(name))
      .map(
        (name) =>
          `${name} is a signed kind on the site but not in the database's register.`
      ),
    ...[...names]
      .filter((name) => !listed.has(name))
      .map(
        (name) =>
          `${name} is in the database's register but not a signed kind on the site.`
      ),
    ...types.flatMap((type) => typeProblems(type, register.get(type.key))),
    ...[...register.keys()]
      .filter((name) => !names.has(name))
      .map(
        (name) =>
          `${name} is in the register but is not a kind people sign on the site.`
      ),
    ...fieldProblems(register),
  ];
  if (problems.length > 0) {
    console.error(
      `The site's agreements and consents differ from the register (${CODE}):\n${problems.map((p) => `- ${p}`).join("\n")}`
    );
    process.exit(1);
  }
  console.log(
    `Agreements and consents: ${types.length} kinds match the register by name (${formKeys.length} on the standard form page).`
  );
};

await main();
