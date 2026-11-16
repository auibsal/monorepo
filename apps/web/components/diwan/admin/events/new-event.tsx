"use client";

import { useTranslations } from "next-intl";
import { RequireModule } from "../admin-shell";
import { RecordPage } from "../kit";
import { EventFacts } from "./facts";

/**
 * A new event, made in the Diwan (decisions.md, Events): saved as a draft
 * with the standard shifts, then finished and published on its own page.
 */
export const NewEvent = () => {
  const t = useTranslations("diwan.admin.event.facts");
  const tk = useTranslations("diwan.admin.kit");
  return (
    <RequireModule module="events">
      <RecordPage
        back="/events"
        backLabel={tk("back")}
        lede={t("newLede")}
        title={t("newTitle")}
      >
        <EventFacts event={null} />
      </RecordPage>
    </RequireModule>
  );
};
