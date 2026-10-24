"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/nexus/language-switcher";
import { SiteHeader } from "@/components/site-header";

/**
 * Sign-in, sign-up and password pages: the public site's header (the way in
 * sits between the site and the Nexus) and one framed sheet. The footer
 * comes from the Nexus layout.
 */
export const AuthFrame = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-1 flex-col">
    <SiteHeader account={false} language={<LanguageSwitcher />} />
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12" id="main">
      {/* The one feature block on the page: the framed sheet with the crimson offset. */}
      <div className="frame grid content-start gap-6 bg-surface p-6 text-text shadow-offset-accent">
        {children}
      </div>
    </main>
  </div>
);
