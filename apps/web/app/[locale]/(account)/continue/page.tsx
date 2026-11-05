import { Suspense } from "react";
import { ContinueToSite } from "@/components/diwan/auth/continue";
import { RequireAuth } from "@/components/diwan/gates";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.continue.title"));

/** Signs the member in (or refreshes their session), then returns them. */
const ContinuePage = () => (
  <RequireAuth>
    <Suspense>
      <ContinueToSite />
    </Suspense>
  </RequireAuth>
);

export default ContinuePage;
