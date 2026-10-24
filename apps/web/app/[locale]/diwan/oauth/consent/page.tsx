import { Suspense } from "react";
import { AuthFrame } from "@/components/nexus/auth/auth-frame";
import { RequireAuth } from "@/components/nexus/gates";
import { OAuthConsent } from "@/components/nexus/oauth/consent";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.oauth.title"));

const ConsentPage = () => (
  <RequireAuth>
    <AuthFrame>
      <Suspense>
        <OAuthConsent />
      </Suspense>
    </AuthFrame>
  </RequireAuth>
);

export default ConsentPage;
