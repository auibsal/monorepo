import { Icon } from "@repo/brand/components/sal/icon";
import { useTranslations } from "next-intl";
import { verifyCredentialsUrl } from "@/lib/storage/photo-metadata";

/**
 * "Content Credentials" under a photo whose original carries them
 * (decisions.md, Media): opens Content Credentials' own page to verify
 * them. Shown only for a photo that does.
 */
export const ContentCredentialsLink = ({
  photoUrl,
}: {
  readonly photoUrl: string;
}) => {
  const t = useTranslations("common");
  return (
    <a
      className="link type-caption"
      href={verifyCredentialsUrl(photoUrl)}
      rel="noopener"
      target="_blank"
    >
      {t("contentCredentials")}
      <Icon
        className="ms-1 align-[-0.15em]"
        label={t("externalLink")}
        name="arrow-up-right"
      />
    </a>
  );
};
