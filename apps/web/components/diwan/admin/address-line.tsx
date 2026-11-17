"use client";

import { useTranslations } from "next-intl";

/**
 * A record's web address, never typed (decisions.md, The site: "Addresses
 * are generated, readable and permanent"): made from the English title (or
 * the Arabic one in Latin letters) until the record is published, then
 * fixed. Shown read-only where the record is edited.
 */
export const AddressLine = ({
  fixed,
  path,
}: {
  /** Whether the record is published, so the address no longer moves. */
  readonly fixed: boolean;
  /** The address as the public sees it, from its first slash. */
  readonly path: string;
}) => {
  const t = useTranslations("diwan.admin.kit.address");
  return (
    <div className="grid gap-1">
      <span className="type-label">{t("label")}</span>
      <p className="type-body break-all" dir="ltr">
        {path}
      </p>
      <p className="type-caption">{fixed ? t("fixed") : t("made")}</p>
    </div>
  );
};
