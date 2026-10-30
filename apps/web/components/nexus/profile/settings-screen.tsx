"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { ConnectedApps } from "./connected-apps";
import { DeleteAccount } from "./delete-account";
import { Passkeys } from "./passkeys";
import { PersonalEmail } from "./personal-email";
import { PhoneNotifications } from "./phone-notifications";
import { TelegramLink } from "./telegram-link";

/**
 * Notices (the overhaul, Oct 30, 2026): every way the Society reaches the
 * member, on one page: email (kept with the profile), the phone and
 * Telegram.
 */
export const NoticesScreen = () => {
  const t = useTranslations("nexus.settings");
  return (
    <DiwanPage lede={t("noticesLede")} narrow title={t("notices")}>
      <DiwanSection id="email" title={t("noticesEmail")}>
        <p className="type-body">
          {t("noticesEmailLine")}{" "}
          <Link
            className="link font-medium"
            href="/membership/settings/profile"
          >
            {t("profile")}
          </Link>
        </p>
      </DiwanSection>
      <PhoneNotifications />
      <TelegramLink />
    </DiwanPage>
  );
};

/**
 * Settings (owner, 2026-10-25): three pages of their own (Profile,
 * Requests, Notices), then how they sign in. What they tell us about themselves is in Profile; what
 * they have sent is in Requests and reports.
 */
export const SettingsScreen = () => {
  const t = useTranslations("nexus.settings");
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <DiwanSection id="yours" title={t("yours")}>
        <RowList>
          <li className="grid gap-1">
            <Link
              className="link font-medium"
              href="/membership/settings/profile"
            >
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
          <li className="grid gap-1">
            <Link
              className="link font-medium"
              href="/membership/settings/notices"
            >
              {t("notices")}
            </Link>
            <p className="type-caption">{t("noticesLine")}</p>
          </li>
        </RowList>
      </DiwanSection>
      <PersonalEmailSection />
      <Passkeys />
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
