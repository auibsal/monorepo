import { describe, expect, test, vi } from "vitest";
import { matchesConfirmation } from "@/components/nexus/profile/delete-account";
import { ApiError, callApi } from "@/lib/nexus/api";
import {
  nexusHref,
  safeNextPath,
  safeSocietyUrl,
  stripLocale,
  stripNexus,
} from "@/lib/nexus/navigation";
import { fakeSupabase } from "./render";

describe("return paths", () => {
  test("only accepts paths inside the app", () => {
    expect(safeNextPath("/en/events?rsvp=1")).toBe("/en/events?rsvp=1");
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
  });

  test("returns only to the Society's own https sites", () => {
    expect(safeSocietyUrl("https://www.auibsal.org/?path=/x")).toBe(
      "https://www.auibsal.org/?path=/x"
    );
    expect(safeSocietyUrl("https://auibsal.org/")).toBe("https://auibsal.org/");
    expect(safeSocietyUrl("http://www.auibsal.org/")).toBeNull();
    expect(safeSocietyUrl("https://auibsal.org.evil.example/")).toBeNull();
    expect(safeSocietyUrl("https://evilauibsal.org/")).toBeNull();
    expect(safeSocietyUrl("javascript:alert(1)")).toBeNull();
  });

  test("drops the locale for the locale-aware router", () => {
    expect(stripLocale("/ar/events?rsvp=1")).toBe("/events?rsvp=1");
    expect(stripLocale("/events")).toBe("/events");
  });

  test("adds the Nexus prefix once, to in-app paths only", () => {
    expect(nexusHref("/events")).toBe("/nexus/events");
    expect(nexusHref("/")).toBe("/nexus");
    expect(nexusHref("/nexus/events")).toBe("/nexus/events");
    expect(nexusHref("https://auibsal.org/events")).toBe(
      "https://auibsal.org/events"
    );
    expect(nexusHref("#telegram")).toBe("#telegram");
    expect(
      nexusHref({ pathname: "/admin/ads/ad", query: { id: "1" } })
    ).toEqual({ pathname: "/nexus/admin/ads/ad", query: { id: "1" } });
    expect(stripNexus("/nexus/events")).toBe("/events");
    expect(stripNexus("/nexus")).toBe("/");
    expect(stripNexus("/events")).toBe("/events");
  });
});

describe("account deletion", () => {
  test("needs the exact phrase, in either language", () => {
    expect(
      matchesConfirmation(" Delete  my account ", "delete my account")
    ).toBe(true);
    expect(matchesConfirmation("delete", "delete my account")).toBe(false);
    expect(matchesConfirmation("احذف حسابي", "احذف حسابي")).toBe(true);
  });
});

describe("callApi", () => {
  const session = { access_token: "token-123" };
  const supabase = fakeSupabase({
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn(),
    },
  });

  test("sends the member's access token", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ ok: true }));
    await callApi(supabase, "/account/delete", {}, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/account/delete",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
        method: "POST",
      })
    );
  });

  test("reports the API's error code", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: "forbidden" }, { status: 403 })
    );
    await expect(callApi(supabase, "/x", {}, fetchImpl)).rejects.toEqual(
      new ApiError(403, "forbidden")
    );
  });

  test("requires a session", async () => {
    await expect(callApi(fakeSupabase(), "/x", {})).rejects.toMatchObject({
      status: 401,
    });
  });
});
