"use client";

import { useRouter } from "@repo/internationalization/navigation";
import { useEffect } from "react";
import { FullPageSpinner } from "./states";

interface ForwardProps {
  /** The page's new address, without the language prefix. */
  readonly to: string;
}

/**
 * Sends a moved page's old address on to its new one, keeping the query
 * (links in emails already sent still work). Done in the page rather than
 * as a redirect: the apps configure none (owner, Oct 14, 2026).
 */
export const Forward = ({ to }: ForwardProps) => {
  const router = useRouter();
  useEffect(() => {
    router.replace(`${to}${window.location.search}`);
  }, [router, to]);
  return <FullPageSpinner />;
};
