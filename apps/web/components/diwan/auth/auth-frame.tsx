"use client";

import type { ReactNode } from "react";

/**
 * Sign-in, sign-up and password pages: one framed sheet under the site's
 * header (from the account layout).
 */
export const AuthFrame = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-1 flex-col">
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12" id="main">
      {/* The one feature block on the page: the framed sheet with the crimson offset. */}
      <div className="border-line pt-space-4 text-text grid content-start gap-6 border-t">
        {children}
      </div>
    </main>
  </div>
);
