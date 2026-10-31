"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/design-system/components/sal/card";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

/** Waiting longer than this means emails are not leaving. */
const STUCK_MS = 15 * 60 * 1000;

/**
 * The Desk's Connected panel: whether the Society's own emails (bookings,
 * Qirtas, the personal address link, the Sunday Paper) are leaving. The
 * database calls the site to send each one; without its address or the
 * two Vault secrets, nothing goes.
 */
export const EmailDelivery = () => {
  const t = useTranslations("nexus.admin.settings.email");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const health = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("core").rpc("outbox_health"))?.[0] ?? null,
    queryKey: ["admin", "outbox-health"],
  });
  const h = health.data;
  const missing = h
    ? [
        h.api_url_set ? null : "platform.api_url",
        h.outbox_secret_set ? null : "outbox_webhook_secret",
        h.cron_secret_set ? null : "cron_secret",
      ].filter((m): m is string => m !== null)
    : [];
  const stuck =
    h?.oldest_waiting !== null &&
    h?.oldest_waiting !== undefined &&
    Date.now() - new Date(h.oldest_waiting).getTime() > STUCK_MS;

  let line: string | null = null;
  if (missing.length > 0) {
    line = t("notConfigured", { missing: missing.join(", ") });
  } else if (stuck) {
    line = t("stuck", { count: String(h?.waiting ?? 0) });
  } else if (h) {
    line = t("flowing");
  }

  return (
    <SalCard>
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body">{t("lede")}</p>
      {line ? (
        <p className="type-caption" role="status">
          {line}
        </p>
      ) : null}
      {h?.last_sent ? (
        <p className="type-caption">
          {t("lastSent", {
            when: `${formatLongDate(h.last_sent, locale)}, ${formatClock(h.last_sent, locale)}`,
          })}
        </p>
      ) : null}
    </SalCard>
  );
};
