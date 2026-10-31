"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useIsStaff } from "@/components/account/member-shell";
import { RecoveryCodes } from "../auth/recovery-codes";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { DeleteAccount } from "./delete-account";
import { EmailNotices } from "./email-notices";
import { Passkeys } from "./passkeys";
import { PersonalEmail } from "./personal-email";
import { PhoneNotifications } from "./phone-notifications";
import { TelegramLink } from "./telegram-link";

/**
 * Notices (the overhaul, Oct 30, 2026): every way the Society reaches the
 * member, on one page: email, the phone and Telegram.
 */
export const NoticesScreen = () => {
  const t = useTranslations("nexus.settings");
  return (
    <DiwanPage lede={t("noticesLede")} narrow title={t("notices")}>
      <DiwanSection id="email" title={t("noticesEmail")}>
        <EmailNotices />
      </DiwanSection>
      <PhoneNotifications />
      <TelegramLink />
    </DiwanPage>
  );
};

/**
 * Settings (owner, 2026-10-25): three pages of their own (Profile,
 * Requests, Notices; officers also declare conflicts of interest here),
 * then how they sign in, with recovery codes for two-step roles. What they tell us about themselves is in Profile; what
 * they have sent is in Requests and reports.
 */
export const SettingsScreen = () => {
  const t = useTranslations("nexus.settings");
  const staff = useIsStaff();
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
          {staff ? (
            <li className="grid gap-1">
              <Link
                className="link font-medium"
                href="/membership/settings/declarations"
              >
                {t("declarations")}
              </Link>
              <p className="type-caption">{t("declarationsLine")}</p>
            </li>
          ) : null}
        </RowList>
      </DiwanSection>
      <PersonalEmailSection />
      <Passkeys />
      <RecoveryCodes />
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
