import en from "@repo/internationalization/messages/en.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { PartnerShell } from "@/components/diwan/partner/partner-shell";
import { Breadcrumb, itemHere, SideMenu } from "@/components/side-menu";
import { useMarkDeepPage } from "@/lib/deep-page";

const pathname = vi.hoisted(() => ({ value: "/partners/dashboard/team" }));
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

const A = ({
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
);

const wrap = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Baghdad">
      {ui}
    </NextIntlClientProvider>
  );

const ITEMS = [
  { href: "/", key: "desk", label: "Desk" },
  {
    href: "/qirtas",
    items: [
      { href: "/qirtas", key: "newsroom", label: "Newsroom" },
      { href: "/qirtas/editions", key: "editions", label: "Editions" },
    ],
    key: "qirtas",
    label: "Qirtas",
  },
];

describe("the one side menu", () => {
  test("names the page shown, never linking to itself", () => {
    wrap(
      <SideMenu
        items={ITEMS}
        label="Diwan"
        link={A}
        pathname="/qirtas/editions"
      />
    );
    for (const current of screen.getAllByText("Editions")) {
      expect(current.tagName).toBe("SPAN");
      expect(current.getAttribute("aria-current")).toBe("page");
    }
    expect(
      screen.getAllByRole("link", { name: "Desk" }).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Menu")).toBeTruthy();
  });

  test("a deep page's breadcrumb leads back to its list", () => {
    wrap(
      <Breadcrumb items={ITEMS} link={A} pathname="/qirtas/editions/haven" />
    );
    expect(
      screen
        .getByRole("link", { name: "Back to Editions" })
        .getAttribute("href")
    ).toBe("/qirtas/editions");
    expect(itemHere(ITEMS, "/qirtas/editions/haven")?.key).toBe("qirtas");
  });
});

const Deep = () => {
  useMarkDeepPage();
  return <p>A record</p>;
};

describe("a space's frame", () => {
  test("the partner dashboard shows the one side menu", () => {
    pathname.value = "/partners/dashboard/team";
    wrap(<PartnerShell>{<p>The team</p>}</PartnerShell>);
    expect(screen.getAllByRole("navigation", { name: "Partner" }).length).toBe(
      1
    );
  });

  test("a deep page shows the way back instead", () => {
    pathname.value = "/partners/dashboard/team/someone";
    wrap(
      <PartnerShell>
        <Deep />
      </PartnerShell>
    );
    expect(screen.queryByRole("navigation", { name: "Partner" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to Team" })).toBeTruthy();
  });
});
