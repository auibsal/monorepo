import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SignInForm } from "@/components/diwan/auth/sign-in-form";
import { fakeSupabase, renderWithApp } from "./render";

// No button offers a sign-in link by email.
const LINK = /link/iu;

test("shows a translated error for wrong credentials", async () => {
  const signInWithPassword = vi.fn(async () => ({
    data: {},
    error: { code: "invalid_credentials", status: 400 },
  }));
  const supabase = fakeSupabase({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword,
    },
  });

  renderWithApp(<SignInForm />, { locale: "en", supabase });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "Student@AUIB.edu.iq" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "wrong-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe(
      "That email and password don’t match."
    )
  );
  expect(signInWithPassword).toHaveBeenCalledWith({
    email: "student@auib.edu.iq",
    password: "wrong-password",
  });
});

test("signing in is by password, with no email link to ask for", () => {
  const supabase = fakeSupabase({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  });

  renderWithApp(<SignInForm />, { locale: "en", supabase });
  expect(screen.getByLabelText("Password")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "student@auib.edu.iq" },
  });
  expect(screen.getByLabelText("Password")).toBeTruthy();
  expect(screen.queryByRole("button", { name: LINK })).toBeNull();
});
