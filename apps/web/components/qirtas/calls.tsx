import {
  CallDetails,
  type OpenCall,
  OpenCallList,
} from "@repo/brand/components/sal/open-call";
import { buttonVariants } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { journal, localized } from "@/lib/data";
import { readPublished } from "@/lib/supabase";

/** The published calls with their Editions (one Edition's, by its slug). */
export const loadCalls = (editionSlug?: string) =>
  readPublished(
    ["journal"],
    (c) => journal.callsWithEditions(c, editionSlug),
    []
  );

/** Letters, Gallery and Video: the sections a call takes, as one phrase. */
const deskPhrase = async (desks: readonly journal.Desk[], locale: Locale) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return new Intl.ListFormat(locale === "ar" ? "ar" : "en-US", {
    type: "conjunction",
  }).format(desks.map((desk) => t(`desks.${desk}`)));
};

/** "Closes Sunday, December 6", or "Any time" until the Edition sets its deadline. */
const closesLine = async (call: journal.EditionCall, locale: Locale) => {
  const t = await getTranslations({
    locale,
    namespace: "web.journal.callPage",
  });
  return journal.hasDeadline(call)
    ? t("closes", { date: formatLongDate(call.closes_at, locale) })
    : t("anyTime");
};

/** The Edition page a call lives on. */
const callHref = (call: journal.EditionCall) =>
  `/qirtas/editions/${call.edition_slug}`;

/**
 * The open call (decisions.md, Qirtas: the Editions page), in the one
 * open-call row: "Edition 0: Haven · Dreams and memories · Closes Sun,
 * Dec 6 · Send your work". Each Edition's call opens the day the previous
 * one closes, so there is one; between calls, the next to open.
 */
export const OpenCallLine = async ({
  calls,
  locale,
  now,
}: {
  readonly calls: readonly journal.EditionCall[];
  readonly locale: Locale;
  readonly now: Date;
}) => {
  const t = await getTranslations({
    locale,
    namespace: "web.journal.callPage",
  });
  const call = journal.openCallAt(calls, now);
  const rows: OpenCall[] = call
    ? [
        {
          action: (
            <Link
              className="link text-sm font-medium"
              href={`${callHref(call)}#send`}
              prefetch={false}
            >
              {t("send")}
            </Link>
          ),
          closes: await closesLine(call, locale),
          key: call.id,
          purpose:
            localized(
              {
                theme_ar: call.edition_theme_ar,
                theme_en: call.edition_theme_en,
              },
              "theme",
              locale
            ) || (await deskPhrase(call.desks, locale)),
          title: (
            <Link className="hover:underline" href={callHref(call)}>
              {localized(call, "title", locale)}
            </Link>
          ),
        },
      ]
    : [];
  return (
    <section aria-label={t("theCall")} className="grid gap-4">
      <OpenCallList calls={rows} empty={t("noneOpen")} label={t("theCall")} />
    </section>
  );
};

/**
 * A call's terms, after its action (decisions.md, The site: "One call
 * page"): what to send (the theme is an invitation, not a rule), who may
 * send, the dates, how it's decided and the reply time. Haven keeps the
 * words of its poster.
 */
export const CallTerms = async ({
  call,
  locale,
}: {
  readonly call: journal.EditionCall;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({
    locale,
    namespace: "web.journal.callPage",
  });
  const desks = await deskPhrase(call.desks, locale);
  const haven = call.edition_slug === "haven";
  const tw = await getTranslations({
    locale,
    namespace: "diwan.journal.write.haven",
  });
  const theme = localized(call, "theme", locale);
  const rows: [string, string][] = haven
    ? [
        [t("terms.what"), `${tw("rules.length")} ${t("themeNote")}`],
        [t("terms.entries"), tw("rules.entries")],
        [t("terms.new"), t("simultaneous")],
        [t("terms.who"), tw("rules.who")],
        [t("terms.own"), t("own")],
      ]
    : [
        [t("terms.what"), theme ? `${theme} ${t("themeNote")}` : desks],
        [t("terms.who"), localized(call, "eligibility", locale) || t("who")],
        [t("terms.new"), t("simultaneous")],
        [t("terms.own"), t("own")],
      ];
  return (
    <CallDetails
      rows={[
        ...rows,
        [
          t("terms.dates"),
          journal.hasDeadline(call)
            ? `${t("dates", {
                date: formatLongDate(call.closes_at, locale),
                time: formatClock(call.closes_at, locale),
              })} ${t("late")}`
            : t("anyTime"),
        ],
        [t("terms.decided"), t("decided")],
        [
          t("terms.reply"),
          call.decisions_at
            ? t("replyBy", { date: formatLongDate(call.decisions_at, locale) })
            : t("reply"),
        ],
        [t("terms.fees"), t("noFees")],
      ]}
    />
  );
};

/**
 * The form buttons for a call, one per type of each section it takes
 * (decisions.md, Qirtas). Signed out, a form sends the visitor to sign in
 * and back to it; there is no sign-in block here.
 */
export const SendButtons = async ({
  call,
  locale,
}: {
  readonly call: journal.EditionCall;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const tj = await getTranslations({
    locale,
    namespace: "diwan.admin.journal",
  });
  return (
    <ul className="divide-line border-line grid divide-y border-y">
      {call.desks.map((desk) => (
        <li className="grid gap-2 py-4 md:grid-cols-[12rem_1fr]" key={desk}>
          <h3 className="type-heading">{t(`desks.${desk}`)}</h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {journal.sendableCategories(desk).map((category) => (
              <li key={category}>
                <Link
                  className="link text-sm font-medium"
                  href={`${callHref(call)}/submit/${category}`}
                  prefetch={false}
                >
                  {tj(`categories.${category}`)}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

/** The call's one solid button: "Submit to Haven". */
export const SubmitButton = ({ label }: { readonly label: string }) => (
  <a className={buttonVariants()} href="#send">
    {label}
  </a>
);
