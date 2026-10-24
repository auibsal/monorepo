import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthCallback } from "@/components/nexus/auth/auth-callback";
import { fakeSupabase, renderWithApp } from "./render";

const replace = vi.fn();
let search = new URLSearchParams();

vi.mock("@repo/internationalization/navigation", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@repo/internationalization/navigation")
  >()),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ replace }),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
  useParams: () => ({}),
  usePathname: () => "/ar",
  useRouter: () => ({}),
  useSearchParams: () => search,
}));

const session = { access_token: "t", user: { id: "u" } };

describe("auth callback", () => {
  beforeEach(() => {
    replace.mockReset();
    search = new URLSearchParams("code=abc");
  });

  test("exchanges the code once and goes home", async () => {
    const exchangeCodeForSession = vi.fn(async () => ({ error: null }));
    const supabase = fakeSupabase();
    Object.assign(supabase.auth, { exchangeCodeForSession });
    renderWithApp(<AuthCallback />, { locale: "en", supabase });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account"));
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  test("a spent code with a live session still signs the member in", async () => {
    const supabase = fakeSupabase();
    Object.assign(supabase.auth, {
      exchangeCodeForSession: vi.fn(async () => ({
        error: { message: "invalid flow state" },
      })),
      getSession: vi.fn(async () => ({ data: { session } })),
    });
    renderWithApp(<AuthCallback />, { locale: "en", supabase });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a spent code without a session shows the error", async () => {
    const supabase = fakeSupabase();
    Object.assign(supabase.auth, {
      exchangeCodeForSession: vi.fn(async () => ({
        error: { message: "invalid flow state" },
      })),
    });
    renderWithApp(<AuthCallback />, { locale: "en", supabase });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
