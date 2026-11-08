import { beforeEach, expect, test, vi } from "vitest";

const state = { error: null as Error | null };

vi.mock("@repo/database/admin", () => ({
  createAdminClient: () => ({
    schema: () => ({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ error: state.error }),
        }),
      }),
    }),
  }),
}));

// Outside a request there is no connection to wait for.
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

const { GET } = await import("@/app/api/health/route");

beforeEach(() => {
  state.error = null;
});

test("answers ok with the commit, never cached", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ database: "ok" });
});

test("answers 503 when the database doesn't", async () => {
  state.error = new Error("down");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ database: "unreachable" });
});
