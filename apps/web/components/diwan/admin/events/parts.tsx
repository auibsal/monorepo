"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine } from "../../states";

/** A meeting's minutes and resolutions, kept in Society, pointing here. */
export const EventMinutes = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.parts");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const minutes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("minutes")
          .select("id, title_en, title_ar, status")
          .eq("event_id", eventId)
      ) ?? [],
    queryKey: ["admin", "event-minutes", eventId],
  });
  return (
    <DiwanSection id="minutes" title={t("minutes")}>
      {(minutes.data ?? []).length > 0 ? (
        <RowList>
          {(minutes.data ?? []).map((m) => (
            <li key={m.id}>
              <Link className="link" href={`/council/meetings/${m.id}`}>
                {localized(m, "title", locale) || m.title_en}
              </Link>
            </li>
          ))}
        </RowList>
      ) : (
        <EmptyLine>{t("noMinutes")}</EmptyLine>
      )}
    </DiwanSection>
  );
};
