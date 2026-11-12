import { describe, expect, it } from "vitest";
import { enqueue, flush, readQueue } from "./door-queue";

const memory = (): Storage => {
  const map = new Map<string, string>();
  return {
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
};

describe("the door's offline queue", () => {
  it("keeps each check-in once", () => {
    const s = memory();
    expect(enqueue(s, "e1", { ticket_code: "a" })).toBe(1);
    expect(enqueue(s, "e1", { ticket_code: "a" })).toBe(1);
    expect(enqueue(s, "e1", { target_user: "u" })).toBe(2);
    expect(readQueue(s, "e2")).toEqual([]);
  });

  it("sends in order and stops while offline", async () => {
    const s = memory();
    enqueue(s, "e1", { ticket_code: "a" });
    enqueue(s, "e1", { ticket_code: "b" });
    enqueue(s, "e1", { ticket_code: "c" });
    const sent: string[] = [];
    const left = await flush(s, "e1", (t) => {
      const code = "ticket_code" in t ? t.ticket_code : "";
      if (code === "b") {
        return Promise.resolve("offline");
      }
      sent.push(code);
      return Promise.resolve("sent");
    });
    expect(sent).toEqual(["a"]);
    expect(left).toBe(2);
    expect(readQueue(s, "e1")).toEqual([
      { ticket_code: "b" },
      { ticket_code: "c" },
    ]);
  });

  it("drops what the database refuses", async () => {
    const s = memory();
    enqueue(s, "e1", { ticket_code: "bad" });
    expect(await flush(s, "e1", () => Promise.resolve("refused"))).toBe(0);
    expect(readQueue(s, "e1")).toEqual([]);
  });
});
