"use client";

import { Link, usePathname } from "@repo/internationalization/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { hasSessionCookie } from "@/lib/auth/session-cookie";

/**
 * The footer's first band, the Sunday Paper (decisions.md, The site: the
 * public footer): one line and the sign-up for everyone; signed in, "Choose
 * your emails" opens Settings → Notifications instead. Read after the first
 * render, so the prerendered page is the same for everyone.
 */
export const SundayPaperAction = ({
  chooseEmails,
  signUp,
}: {
  /** "Choose your emails", passed in from the server's copy. */
  readonly chooseEmails: string;
  readonly signUp: ReactNode;
}) => {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (pathname) {
      setSignedIn(hasSessionCookie(document.cookie));
    }
  }, [pathname]);
  return signedIn ? (
    <Link
      className="link justify-self-start"
      href="/account/settings/notifications"
    >
      {chooseEmails}
    </Link>
  ) : (
    signUp
  );
};
