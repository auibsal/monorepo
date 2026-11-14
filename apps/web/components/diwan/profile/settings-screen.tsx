"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { useIsStaff } from "@/components/account/member-shell";
import { useMyMembership } from "@/lib/diwan/queries";
import { RecoveryCodes } from "../auth/recovery-codes";
import { TwoStepSettings } from "../auth/two-step";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { AccountLanguage } from "./account-language";
import {
  ArabicFormChoice,
  OfficialName,
  RecordEmails,
  ShortNameChoice,
} from "./account-settings";
import { DeleteAccount } from "./delete-account";
import { DownloadData } from "./download-data";
import { EsignSettings } from "./esign";
import { NoticeGrid } from "./notice-grid";
import { Passkeys } from "./passkeys";
import { ChangePassword } from "./password";
import { PersonalEmail } from "./personal-email";
import { Sessions } from "./sessions";
import { TelegramLink } from "./telegram-link";

/**
 * Notices (the overhaul, Oct 30, 2026): every way the Society reaches the
 * member, on one page: email, the phone and Telegram.
 */
export const NoticesScreen = () => {
  const t = useTranslations("diwan.settings");
  return (
    <DiwanPage lede={t("noticesLede")} narrow title={t("notices")}>
      <DiwanSection id="email" title={t("noticesEmail")}>
        <AccountLanguage />
        <NoticeGrid />
      </DiwanSection>
      <TelegramLink />
    </DiwanPage>
  );
};

/**
 * Settings, in four sections (decisions.md, The site): Account (the
 * official name, the short-name choice, language, the Arabic form),
 * Notifications, Security and Your data. What the person sent is under
 * Requests; officers declare conflicts of interest here.
 */
export const SettingsScreen = () => {
  const t = useTranslations("diwan.settings");
  const staff = useIsStaff();
  // Requests and the personal email are a member's (an AUIB address that
  // ends at graduation).
  const member = useMyMembership().data?.kind === "member";
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <DiwanSection id="account" title={t("sections.account")}>
        <OfficialName />
        <ShortNameChoice />
        <AccountLanguage />
        <ArabicFormChoice />
        {member ? <PersonalEmail /> : null}
        <RowList>
          {member ? (
            <li className="grid gap-1">
              <Link className="link font-medium" href="/account/requests">
                {t("requests")}
              </Link>
              <p className="type-caption">{t("requestsLine")}</p>
            </li>
          ) : null}
          {staff ? (
            <li className="grid gap-1">
              <Link
                className="link font-medium"
                href="/account/settings/disclosures"
              >
                {t("declarations")}
              </Link>
              <p className="type-caption">{t("declarationsLine")}</p>
            </li>
          ) : null}
        </RowList>
      </DiwanSection>
      <DiwanSection id="notifications" title={t("sections.notifications")}>
        <RecordEmails />
        <Link
          className="link justify-self-start"
          href="/account/settings/notifications"
        >
          {t("noticesByChannel")}
        </Link>
      </DiwanSection>
      <DiwanSection id="security" title={t("sections.security")}>
        <ChangePassword />
        <TwoStepSettings />
        <Passkeys />
        <Sessions />
        <RecoveryCodes />
        <EsignSettings />
      </DiwanSection>
      <DiwanSection id="your-data" title={t("sections.data")}>
        <DownloadData />
        <DeleteAccount />
      </DiwanSection>
    </DiwanPage>
  );
};
