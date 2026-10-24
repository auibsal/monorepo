import type { ReactNode } from "react";

/** The paper is printed on paper (v6): every page of it on `paper`. */
const PaperLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="h-full bg-surface-reading">{children}</div>
);

export default PaperLayout;
