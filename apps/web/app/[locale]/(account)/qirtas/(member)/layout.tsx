import type { ReactNode } from "react";
import { RequireAuth, RequireMember } from "@/components/diwan/gates";

/**
 * The forms, drafts and members-only pieces: on Qirtas's paper, for
 * signed-in members and guests (the gates as everywhere in your account).
 */
const QirtasMemberLayout = ({ children }: { readonly children: ReactNode }) => (
  <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-16" id="main">
    <RequireAuth>
      <RequireMember>{children}</RequireMember>
    </RequireAuth>
  </main>
);

export default QirtasMemberLayout;
