"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { passEnabled } from "@/lib/nexus/pass-enabled";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { ConnectedApps } from "./connected-apps";
import { DeleteAccount } from "./delete-account";
import { Passkeys } from "./passkeys";
import { PersonalEmail } from "./personal-email";
import { PhoneNotifications } from "./phone-notifications";
import { TelegramLink } from "./telegram-link";

/**
 * Settings (owner, 2026-10-25): how the Society reaches the member and how
 * they sign in. What they tell us about themselves is in Profile; what
 * they have sent is in Requests and reports.
 */
export const SettingsScreen = () => {
  const t = useTranslations("nexus.settings");
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <DiwanSection id="yours" title={t("yours")}>
        <RowList>
          <li className="grid gap-1">
            <Link className="link font-medium" href="/membership/profile">
              {t("profile")}
            </Link>
            <p className="type-caption">{t("profileLine")}</p>
          </li>
          <li className="grid gap-1">
            <Link className="link font-medium" href="/membership/requests">
              {t("requests")}
            </Link>
            <p className="type-caption">{t("requestsLine")}</p>
          </li>
        </RowList>
      </DiwanSection>
      <PersonalEmailSection />
      <PhoneNotifications />
      <TelegramLink />
      {/* Signing in, passwords and passkeys are on The IDEA Pass. */}
      {passEnabled ? (
        <DiwanSection description={t("passLine")} id="pass" title={t("pass")}>
          {null}
        </DiwanSection>
      ) : (
        <Passkeys />
      )}
      <ConnectedApps />
      <DeleteAccount />
    </DiwanPage>
  );
};

const PersonalEmailSection = () => {
  const t = useTranslations("nexus.personalEmail");
  return (
    <DiwanSection id="personal-email" title={t("title")}>
      <PersonalEmail />
    </DiwanSection>
  );
};
