import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RequireStaff } from "@/components/nexus/gates";
import { fakeSupabase, renderWithApp } from "./render";

const replace = vi.fn();

vi.mock("@repo/internationalization/navigation", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@repo/internationalization/navigation")
  >()),
  usePathname: () => "/diwan",
  useRouter: () => ({ replace }),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
  useParams: () => ({}),
  usePathname: () => "/diwan",
  useRouter: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const session = { access_token: "t", user: { id: "u" } };

/** A signed-in session whose roles and second step the test decides. */
const officer = ({
  grants,
  level,
  needs,
}: {
  grants: unknown[];
  level: "aal1" | "aal2";
  needs: boolean;
}) => {
  const rpc = vi.fn(async (name: string) => ({
    data: name === "needs_two_step" ? needs : grants,
    error: null,
  }));
  const supabase = fakeSupabase({ schema: () => ({ rpc }) });
  Object.assign(supabase.auth, {
    mfa: {
      getAuthenticatorAssuranceLevel: vi.fn(async () => ({
        data: { currentLevel: level },
      })),
      listFactors: vi.fn(async () => ({
        data: { all: [], totp: [{ id: "f", status: "verified" }] },
      })),
    },
    onAuthStateChange: vi.fn((callback: (e: string, s: unknown) => void) => {
      callback("INITIAL_SESSION", session);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  });
  return supabase;
};

describe("the Diwan's staff gate", () => {
  beforeEach(() => replace.mockReset());

  test("an officer before the second step is asked for the code, not sent away", async () => {
    renderWithApp(
      <RequireStaff>
        <p>The Diwan</p>
      </RequireStaff>,
      {
        locale: "en",
        supabase: officer({ grants: [], level: "aal1", needs: true }),
      }
    );
    expect(await screen.findByLabelText("Six-digit code")).toBeTruthy();
    expect(screen.queryByText("The Diwan")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  test("after the second step the Diwan opens", async () => {
    renderWithApp(
      <RequireStaff>
        <p>The Diwan</p>
      </RequireStaff>,
      {
        locale: "en",
        supabase: officer({
          grants: [{ permission: "members.manage", scope_type: "global" }],
          level: "aal2",
          needs: true,
        }),
      }
    );
    expect(await screen.findByText("The Diwan")).toBeTruthy();
  });

  test("after the code, the Diwan opens even when the roles arrive last", async () => {
    // The level turns aal2 at once; the roles come back 200 ms later.
    let level: "aal1" | "aal2" = "aal1";
    const rpc = vi.fn(async (name: string) => {
      if (name === "needs_two_step") {
        return { data: true, error: null };
      }
      if (level === "aal1") {
        return { data: [], error: null };
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        data: [{ permission: "members.manage", scope_type: "global" }],
        error: null,
      };
    });
    const supabase = officer({ grants: [], level: "aal1", needs: true });
    Object.assign(supabase, { schema: () => ({ rpc }) });
    Object.assign(supabase.auth.mfa, {
      challengeAndVerify: vi.fn(() => {
        level = "aal2";
        return Promise.resolve({ data: {}, error: null });
      }),
      getAuthenticatorAssuranceLevel: vi.fn(async () => ({
        data: { currentLevel: level },
      })),
    });
    renderWithApp(
      <RequireStaff>
        <p>The Diwan</p>
      </RequireStaff>,
      { locale: "en", supabase }
    );
    fireEvent.change(await screen.findByLabelText("Six-digit code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("The Diwan")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  test("a member without a role goes to Membership", async () => {
    renderWithApp(
      <RequireStaff>
        <p>The Diwan</p>
      </RequireStaff>,
      {
        locale: "en",
        supabase: officer({ grants: [], level: "aal1", needs: false }),
      }
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/membership"));
    expect(screen.queryByText("The Diwan")).toBeNull();
  });
});
