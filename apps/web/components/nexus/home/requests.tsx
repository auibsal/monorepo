"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { SentList } from "../forms/forms";
import { Section } from "./section";

/** What the member has sent lately, with the way to everything else. */
export const Requests = () => {
  const t = useTranslations("nexus.forms");
  return (
    <Section
      action={
        <Link className="link type-caption" href="/account/requests">
          {t("mineAll")}
        </Link>
      }
      id="requests"
      title={t("title")}
    >
      <SentList limit={3} />
    </Section>
  );
};
