"use client";

import { usePathname } from "@repo/internationalization/navigation";
import type { ReactNode } from "react";

/** The private spaces under the account layout (decisions.md, The site). */
const PRIVATE = ["/account", "/partners/dashboard"];

const under = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

/**
 * Picks the footer by address: the private spaces (your account, the
 * partner dashboard) take the slim one, Qirtas's pages the public footer
 * with Qirtas's line, every other page the public footer.
 */
export const FooterSwitch = ({
  full,
  qirtas,
  slim,
}: {
  readonly full: ReactNode;
  readonly qirtas?: ReactNode;
  readonly slim?: ReactNode;
}) => {
  const pathname = usePathname();
  if (slim && PRIVATE.some((path) => under(pathname, path))) {
    return slim;
  }
  if (qirtas && under(pathname, "/qirtas")) {
    return qirtas;
  }
  return full;
};
