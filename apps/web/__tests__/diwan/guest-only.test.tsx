import { screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { GuestOnly } from "@/components/diwan/gates";
import { fakeSupabase, renderWithApp } from "./render";

// The sign-in and sign-up forms are laid out, hidden and inert, while the
// session is read, so the page doesn't jump when they appear.
test("lays the form out, inert, while the session is read", () => {
  const supabase = fakeSupabase({
    auth: {
      getSession: vi.fn(() => new Promise(() => undefined)),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  });
  renderWithApp(
    <GuestOnly>
      <p>The form</p>
    </GuestOnly>,
    { locale: "en", supabase }
  );
  const form = screen.getByText("The form").parentElement;
  expect(form?.className).toContain("invisible");
  expect(form?.hasAttribute("inert")).toBe(true);
  expect(form?.parentElement?.getAttribute("aria-busy")).toBe("true");
});

test("shows the form to someone signed out", async () => {
  // Supabase reports the first session (none) as soon as it is asked.
  const supabase = fakeSupabase({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(
        (report: (event: string, session: null) => void) => {
          queueMicrotask(() => report("INITIAL_SESSION", null));
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
      ),
    },
  });
  renderWithApp(
    <GuestOnly>
      <p>The form</p>
    </GuestOnly>,
    { locale: "en", supabase }
  );
  await waitFor(() =>
    expect(screen.getByText("The form").parentElement?.className).not.toContain(
      "invisible"
    )
  );
  expect(
    screen.getByText("The form").parentElement?.hasAttribute("inert")
  ).toBe(false);
});
