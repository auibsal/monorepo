import { notFound } from "next/navigation";
import { Forward } from "@/components/nexus/forward";

interface CatchAllProps {
  readonly params: Promise<{ rest: string[] }>;
}

// The members' pages left the Diwan for the site (owner, Oct 24, 2026).
// Their old addresses, in emails already sent and in the sign-in emails,
// forward to the new ones.
const MOVED: Record<string, string> = {
  certificate: "/membership/record",
  forms: "/membership/requests",
  "forms/fill": "/membership/requests/new",
  "forms/view": "/membership/requests",
  offers: "/membership",
  profile: "/membership/settings/profile",
  society: "/membership/society",
};
const SAME =
  /^(auth\/(callback|confirm|reset)|oauth\/consent|sign-in|sign-up|forgot-password|setup|continue|qirtas\/(submit|submission|work|piece))$/;

/** Unknown paths inside the Diwan: a moved page forwards, the rest is not found. */
const CatchAll = async ({ params }: CatchAllProps) => {
  const path = (await params).rest.join("/");
  const to = MOVED[path] ?? (SAME.test(path) ? `/${path}` : null);
  if (!to) {
    notFound();
  }
  return <Forward to={to} />;
};

export default CatchAll;
