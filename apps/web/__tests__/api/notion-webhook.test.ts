// @vitest-environment node
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

const SECRET = "secret_".padEnd(40, "x");
const env: { NOTION_WEBHOOK_SECRET?: string } = {};
const runNotionSync = vi.fn(async () => ({ problems: [] }));
const later: (() => Promise<void>)[] = [];

vi.mock("@/env", () => ({ env }));
vi.mock("@/lib/api/notion/run", () => ({ runNotionSync }));
vi.mock("@/lib/api/rate-limit", () => ({
  withinRateLimit: vi.fn(async () => true),
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => later.push(task),
}));
vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), warn: vi.fn() },
}));

const { POST } = await import("@/app/api/hooks/notion/route");

const call = (body: string, signature?: string) =>
  POST(
    new Request("https://auibsal.org/api/hooks/notion", {
      body,
      headers: signature ? { "x-notion-signature": signature } : {},
      method: "POST",
    })
  );

describe("Notion's webhook", () => {
  beforeEach(() => {
    runNotionSync.mockClear();
    later.length = 0;
    env.NOTION_WEBHOOK_SECRET = undefined;
  });

  test("before it is verified, it accepts only Notion's verification call", async () => {
    expect(
      (await call(JSON.stringify({ verification_token: SECRET }))).status
    ).toBe(204);
    expect((await call(JSON.stringify({ type: "page.created" }))).status).toBe(
      503
    );
  });

  test("a signed change starts a sync after the answer", async () => {
    env.NOTION_WEBHOOK_SECRET = SECRET;
    const body = JSON.stringify({ type: "page.properties_updated" });
    const signature = `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
    expect((await call(body, signature)).status).toBe(204);
    expect(runNotionSync).not.toHaveBeenCalled();
    await later[0]?.();
    expect(runNotionSync).toHaveBeenCalledTimes(1);
  });

  test("an unsigned or forged call is refused", async () => {
    env.NOTION_WEBHOOK_SECRET = SECRET;
    const body = JSON.stringify({ type: "page.deleted" });
    expect((await call(body)).status).toBe(401);
    expect((await call(body, "sha256=00")).status).toBe(401);
    expect(later).toHaveLength(0);
  });
});
