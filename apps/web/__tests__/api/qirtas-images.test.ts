// @vitest-environment node
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface Row {
  [key: string]: unknown;
}

const state = vi.hoisted(() => ({
  inserted: [] as Row[],
  mediaCount: 0,
  originals: new Map<string, Uint8Array>(),
  piece: null as Row | null,
  submitted: [] as Row[],
  uploaded: [] as { area: string; bytes: Uint8Array; type: string }[],
}));

/** A query that resolves to `result` however it is narrowed. */
const query = (result: object) => {
  const chain = Object.assign(Promise.resolve(result), {
    eq: () => chain,
    maybeSingle: () => Promise.resolve(result),
    order: () => chain,
    select: () => chain,
  });
  return chain;
};

vi.mock("@repo/auth/verify", () => ({
  authenticateRequest: async (request: Request) =>
    request.headers.get("authorization")
      ? {
          supabase: {
            schema: () => ({
              from: (table: string) =>
                table === "pieces"
                  ? query({ data: state.piece })
                  : {
                      ...query({ count: state.mediaCount }),
                      insert: (row: Row) => {
                        state.inserted.push(row);
                        return Promise.resolve({ error: null });
                      },
                    },
            }),
          },
          userId: "editor",
        }
      : null,
}));

vi.mock("@repo/database/admin", () => ({
  createAdminClient: () => ({
    schema: () => ({ from: () => query({ data: state.submitted }) }),
    storage: {
      from: () => ({
        download: (path: string) =>
          Promise.resolve({
            data: new Blob([new Uint8Array(state.originals.get(path) ?? [])]),
            error: null,
          }),
      }),
    },
  }),
}));

vi.mock("@repo/storage", () => ({
  uploadMedia: async (_client: unknown, area: string, file: File) => {
    state.uploaded.push({
      area,
      bytes: new Uint8Array(await file.arrayBuffer()),
      type: file.type,
    });
    return { path: `${area}/${state.uploaded.length}.jpg` };
  },
}));

const { POST } = await import("@/app/api/qirtas/images/route");

const PIECE = "11111111-1111-4111-8111-111111111111";

const call = (body: object, signedIn = true) =>
  POST(
    new Request("https://api.example/qirtas/images", {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...(signedIn ? { authorization: "Bearer t" } : {}),
      },
      method: "POST",
    })
  );

/** A JPEG that carries a camera's EXIF, as phones write it. */
const photo = (width: number) =>
  sharp({
    create: { background: "#9c213e", channels: 3, height: 40, width },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: "The writer", Make: "Phone" } })
    .toBuffer()
    .then((b) => new Uint8Array(b));

beforeEach(() => {
  state.inserted = [];
  state.mediaCount = 0;
  state.originals = new Map();
  state.piece = { id: PIECE, submission_id: "s1" };
  state.submitted = [];
  state.uploaded = [];
});

describe("POST /qirtas/images", () => {
  it("is for signed-in editors, about one piece", async () => {
    expect((await call({ piece: PIECE }, false)).status).toBe(401);
    expect((await call({ piece: "nope" })).status).toBe(400);
  });

  it("needs a piece the editor can see that came from a submission", async () => {
    state.piece = null;
    expect((await call({ piece: PIECE })).status).toBe(404);
    state.piece = { id: PIECE, submission_id: null };
    expect((await call({ piece: PIECE })).status).toBe(404);
  });

  it("leaves a piece's own images alone", async () => {
    state.mediaCount = 2;
    expect((await call({ piece: PIECE })).status).toBe(409);
    expect(state.uploaded).toEqual([]);
  });

  it("copies the submitted images in order, without their metadata", async () => {
    state.originals.set("a", await photo(60));
    state.originals.set("b", await photo(80));
    // The originals carry EXIF; the copies must not.
    expect(
      (await sharp(state.originals.get("a")).metadata()).exif
    ).toBeDefined();
    state.submitted = [
      { mime_type: "image/jpeg", storage_path: "a" },
      { mime_type: "image/jpeg", storage_path: "b" },
    ];
    const response = await call({ piece: PIECE });
    expect(await response.json()).toEqual({ added: 2 });
    expect(state.uploaded.map((u) => u.area)).toEqual([
      `qirtas/${PIECE}`,
      `qirtas/${PIECE}`,
    ]);
    const copies = await Promise.all(
      state.uploaded.map((upload) => sharp(upload.bytes).metadata())
    );
    expect(copies.map((m) => m.exif)).toEqual([undefined, undefined]);
    expect(state.inserted).toMatchObject([
      { height: 40, piece_id: PIECE, sort: 0, width: 60 },
      { height: 40, piece_id: PIECE, sort: 1, width: 80 },
    ]);
  });

  it("says when the submission sent no images", async () => {
    expect((await call({ piece: PIECE })).status).toBe(404);
  });
});
