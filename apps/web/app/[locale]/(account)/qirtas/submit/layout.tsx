import type { ReactNode } from "react";

/** The gateway, open to visitors: on Qirtas's paper, without the gates. */
const SubmitLayout = ({ children }: { readonly children: ReactNode }) => (
  <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16" id="main">
    {children}
  </main>
);

export default SubmitLayout;
