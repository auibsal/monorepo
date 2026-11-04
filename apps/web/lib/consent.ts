import type { ConsentPurpose } from "@repo/analytics/consent";
import { env } from "@/env";

/** What the consent card asks about: only what is switched on. */
export const askedConsent = (): Record<ConsentPurpose, boolean> => ({
  analytics: Boolean(env.NEXT_PUBLIC_GTM_ID || env.NEXT_PUBLIC_GA_ID),
});
