import en from "@repo/internationalization/messages/en.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { MemberShell } from "@/components/account/member-shell";
import { useMarkDeepPage } from "@/lib/deep-page";

const pathname = vi.hoisted(() => ({ value: "/account/work" }));
vi.mock("@repo/internationalization/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => pathname.value,
}));
vi.mock("@/lib/auth/provider", () => ({
  useAuth: () => ({ loading: false, supabase: {}, user: { id: "me" } }),
}));
vi.mock("@/lib/diwan/queries", () => ({
  useMemberStatus: () => ({ data: null, isSuccess: true }),
  useMyMembership: () => ({ data: { kind: "member" } }),
}));
vi.mock("@/components/diwan/admin/admin-shell", () => ({
  useVisibleModules: () => ({ grants: { isSuccess: true }, visible: [] }),
}));

const wrap = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Baghdad">
      {ui}
    </NextIntlClientProvider>
  );

const Deep = () => {
  useMarkDeepPage();
  return <p>A piece</p>;
};

describe("Your account's frame", () => {
  test("shows the one side menu, the page shown named and not linked", () => {
    pathname.value = "/account/work";
    wrap(<MemberShell>{<p>Work</p>}</MemberShell>);
    expect(
      screen.getAllByRole("navigation", { name: "Your account" })
    ).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Work" })).toBeNull();
    expect(
      screen.getAllByRole("link", { name: "Today" }).length
    ).toBeGreaterThan(0);
  });

  test("a deep page hides it and shows the way back", () => {
    pathname.value = "/account/work/123";
    wrap(
      <MemberShell>
        <Deep />
      </MemberShell>
    );
    expect(
      screen.queryByRole("navigation", { name: "Your account" })
    ).toBeNull();
    expect(screen.getByRole("link", { name: "Back to Work" })).toBeTruthy();
  });
});
