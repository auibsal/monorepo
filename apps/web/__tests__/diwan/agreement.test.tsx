import en from "@repo/internationalization/messages/en.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import { Agreement } from "@/components/agreement";
import { ContentCredentialsLink } from "@/components/content-credentials";
import { TeamList } from "@/components/team-list";
import { fakeSupabase, renderWithApp } from "./render";

const RECORD = /Record AGR-0042/u;
const SIGN_AS = /Sign as/u;
const CREDENTIALS = /Content Credentials/u;

const signedIn = () => {
  const rpc = vi.fn((name: string) => {
    if (name === "my_register_name") {
      return Promise.resolve({ data: "Sara Ali", error: null });
    }
    if (name === "my_esign") {
      return Promise.resolve({
        data: [{ agreed_at: "2026-11-01T10:00:00Z" }],
        error: null,
      });
    }
    return Promise.resolve({
      data: name === "my_card" ? [] : null,
      error: null,
    });
  });
  const supabase = fakeSupabase({
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
      rpc,
    }),
  });
  Object.assign(supabase.auth, {
    onAuthStateChange: (
      listen: (event: string, session: { user: { id: string } }) => void
    ) => {
      listen("SIGNED_IN", { user: { id: "me" } });
      return { data: { subscription: { unsubscribe: () => undefined } } };
    },
  });
  return supabase;
};

describe("the one agreement", () => {
  test("summary, the full text in place, one Sign as, then the record", async () => {
    const sign = vi.fn(() => Promise.resolve("AGR-0042"));
    renderWithApp(
      <Agreement
        full={<p>The whole agreement.</p>}
        sign={sign}
        summary={["One.", "Two.", "Three."]}
        title="The role agreement"
      />,
      { locale: "en", supabase: signedIn() }
    );
    expect(screen.getByText("Three.")).toBeTruthy();
    expect(screen.getByText("Read the full text")).toBeTruthy();
    const button = await screen.findByRole("button", {
      name: "Sign as Sara Ali",
    });
    await waitFor(() =>
      expect((button as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(button);
    await screen.findByText(RECORD);
    expect(sign).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("button", { name: SIGN_AS })).toBeNull();
  });
});

describe("the one team list and the credentials link", () => {
  test("an open place says so, or who covers it", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Baghdad">
        <TeamList
          groups={[
            {
              heading: "Qirtas",
              key: "q",
              members: [
                { key: "a", name: "Sara Ali", title: "Editor-in-Chief" },
                { key: "b", name: null, title: "News editor" },
                {
                  key: "c",
                  name: null,
                  note: "Covered by the Editor-in-Chief",
                  title: "Voices editor",
                },
              ],
            },
          ]}
          open="Open"
        />
        <ContentCredentialsLink photoUrl="https://auibsal.org/p.jpg" />
      </NextIntlClientProvider>
    );
    expect(screen.getByText("Sara Ali")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("Covered by the Editor-in-Chief")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: CREDENTIALS }).getAttribute("href")
    ).toContain("contentcredentials.org/verify");
  });
});
