import { describe, expect, test, vi } from "vitest";
import {
  assignRole,
  brokenRoleRule,
  isActiveAssignment,
  roleAssignmentSchema,
} from "./access";
import type { Client } from "./client";

const user = "0b6f6d5e-1f2a-4c3b-9d8e-7f6a5b4c3d2e";
const base = {
  ends_at: null,
  role_key: "director",
  scope_id: null,
  scope_type: "global" as const,
  starts_at: "2026-10-05T09:00:00.000Z",
  target_user: user,
};

describe("role assignments", () => {
  test("a global role has no scope id; a scoped role needs one", () => {
    expect(roleAssignmentSchema.safeParse(base).success).toBe(true);
    expect(
      roleAssignmentSchema.safeParse({ ...base, scope_type: "programme" })
        .success
    ).toBe(false);
    expect(
      roleAssignmentSchema.safeParse({ ...base, scope_id: user }).success
    ).toBe(false);
  });

  test("an assignment cannot end before it starts (as in the table check)", () => {
    expect(
      roleAssignmentSchema.safeParse({
        ...base,
        ends_at: "2026-10-04T09:00:00.000Z",
      }).success
    ).toBe(false);
  });

  test("active means started and not yet ended", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(isActiveAssignment(base, now)).toBe(true);
    expect(
      isActiveAssignment({ ...base, ends_at: "2026-10-05T11:00:00Z" }, now)
    ).toBe(false);
    expect(
      isActiveAssignment({ ...base, starts_at: "2026-10-06T00:00:00Z" }, now)
    ).toBe(false);
  });
});

describe("assigning a role", () => {
  test("sends empty notes and titles as not given", async () => {
    const rpc = vi.fn(async () => ({ data: "assignment-id", error: null }));
    const client = { schema: () => ({ rpc }) } as unknown as Client;
    await assignRole(client, { ...base, note: "", title_en: "" });
    expect(rpc).toHaveBeenCalledWith(
      "assign_role",
      expect.objectContaining({
        ends_at: undefined,
        note: undefined,
        role_key: "director",
        scope_id: undefined,
        title_en: undefined,
      })
    );
  });

  test("names the rule the database refused it under", () => {
    expect(brokenRoleRule(new Error("one_council_seat"))).toBe(
      "one_council_seat"
    );
    expect(brokenRoleRule(new Error("something else"))).toBeNull();
    expect(brokenRoleRule("one_council_seat")).toBeNull();
  });
});
