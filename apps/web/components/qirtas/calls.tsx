import {
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

/** "Closes Sunday, December 6" or "Any time" (the general submissions). */
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
 * Open now (decisions.md, Qirtas: the Editions page), one row per open call
 * in the one open-call pattern: the call · its sections · when it closes ·
 * Send your work.
 */
export const OpenNow = async ({
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
  const open = calls.filter((call) => journal.isOpenAt(call, now));
  const rows: OpenCall[] = await Promise.all(
    open.map(async (call) => ({
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
      purpose: await deskPhrase(call.desks, locale),
      title: (
        <Link className="hover:underline" href={callHref(call)}>
          {localized(call, "title", locale)}
        </Link>
      ),
    }))
  );
  return (
    <section aria-labelledby="open-now" className="grid gap-4">
      <h2 className="type-title" id="open-now">
        {t("openNow")}
      </h2>
      <OpenCallList calls={rows} empty={t("noneOpen")} label={t("openNow")} />
    </section>
  );
};

/**
 * A call's terms, after its action (decisions.md, The site: "One call
 * page"): who may send, what to send, the dates, how it's decided and the
 * reply time. Haven, the pilot, keeps the words of its poster; every
 * Edition's general submissions share theirs.
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
  const haven = call.edition_slug === "haven" && call.kind === "themed";
  const tw = await getTranslations({
    locale,
    namespace: "diwan.journal.write.haven",
  });
  const rows: [string, string][] = haven
    ? [
        [t("terms.what"), tw("rules.length")],
        [t("terms.entries"), tw("rules.entries")],
        [t("terms.new"), tw("rules.new")],
        [t("terms.who"), tw("rules.who")],
        [t("terms.own"), tw("rules.own")],
      ]
    : [
        [t("terms.what"), localized(call, "theme", locale) || desks],
        [
          t("terms.who"),
          localized(call, "eligibility", locale) || t("general.who"),
        ],
        [t("terms.new"), t("general.simultaneous")],
        [t("terms.own"), t("general.own")],
      ];
  const decided =
    call.kind === "general" ? t("general.decided") : t("themed.decided");
  const reply =
    call.kind === "general"
      ? t("general.reply")
      : t("themed.reply", {
          date: call.decisions_at
            ? formatLongDate(call.decisions_at, locale)
            : t("themed.afterClose"),
        });
  return (
    <dl className="border-line grid max-w-3xl border-t">
      {[
        ...rows,
        [
          t("terms.dates"),
          journal.hasDeadline(call)
            ? t("dates", {
                date: formatLongDate(call.closes_at, locale),
                time: formatClock(call.closes_at, locale),
              })
            : t("anyTime"),
        ] as [string, string],
        [t("terms.decided"), decided] as [string, string],
        [t("terms.reply"), reply] as [string, string],
        [t("terms.fees"), t("noFees")] as [string, string],
      ].map(([term, value]) => (
        <div
          className="border-line grid gap-1 border-b py-3 sm:grid-cols-[12rem_1fr]"
          key={term}
        >
          <dt className="type-label">{term}</dt>
          <dd className="type-body">{value}</dd>
        </div>
      ))}
    </dl>
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
