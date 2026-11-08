import { Guilloche, seedFromText } from "@repo/brand/components/sal/guilloche";
import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { formatPlainDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localized, membership, recognition } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

// Made on its first visit (its address names a record), then kept until
// it is published again.
export const instant = false;

const CODE = /^[a-z0-9]{6,32}$/u;

interface CertificateParams {
  readonly params: Promise<{ code: string; locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: CertificateParams): Promise<Metadata> => {
  const { code, locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.verify" });
  return {
    ...localizedMetadata(locale, `/verify/${code}`, {
      description: t("lede"),
      title: t("title"),
    }),
    robots: { follow: false, index: false },
  };
};

/**
 * One check for codes (decisions.md): a certificate (issued or
 * revoked), what was awarded and when; a service letter (F-05), who it is
 * for, for what and when; a membership card's code goes on to the card's
 * own check.
 */
const Rows = ({ rows }: { rows: [string, string][] }) => (
  <dl className="border-line grid gap-3 border-t p-5">
    {rows.map(([label, value]) => (
      <div className="grid gap-1 sm:grid-cols-[10rem_1fr]" key={label}>
        <dt className="type-label">{label}</dt>
        <dd className="type-body" dir="auto">
          {value}
        </dd>
      </div>
    ))}
  </dl>
);

const CertificatePage = async ({ params }: CertificateParams) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.verify" });
  const valid = CODE.test(code);
  const [certificate, letter] = valid
    ? await Promise.all([
        readPublished(
          ["certificates"],
          (c) => recognition.verifyCertificate(c, code),
          null
        ),
        readPublished(
          ["certificates"],
          (c) => recognition.verifyServiceLetter(c, code),
          null
        ),
      ])
    : [null, null];

  if (!(certificate || letter) && membership.CARD_CODE.test(code)) {
    redirect(localizedPath(locale, membership.cardPath(code)));
  }
  const date = (value: string | null) =>
    value ? formatPlainDate(value, locale) : "";

  // A service letter (F-05): who, for what, when, and whether it stands.
  if (letter && !certificate) {
    const rows: [string, string][] = [
      [t("holder"), localized(letter, "holder", locale)],
      [t("kind"), t("letter")],
      [t("role"), localized(letter, "role", locale)],
      [
        t("period"),
        `${date(letter.period_from)} – ${date(letter.period_to) || t("present")}`,
      ],
      [t("issued"), date(letter.issued_at)],
    ];
    return (
      <div className="mx-auto grid w-full max-w-xl gap-8 px-4 py-16">
        <PageHeader lede={t("lede")} title={t("title")} />
        <p className="text-text font-bold" role="status">
          {letter.revoked_at
            ? t("letterRevoked", { date: date(letter.revoked_at) })
            : t("letterValid")}
        </p>
        <Rows rows={rows} />
        <p className="type-caption">{t("letterSignedBy")}</p>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
        <PageHeader lede={t("notFound")} title={t("title")} />
        <Link className="underline underline-offset-4" href="/verify">
          {t("again")}
        </Link>
      </div>
    );
  }

  // A certificate: what was awarded and when. A Qalam student shows only
  // as their first name, last initial, school and year.
  const kind = certificate.kind as recognition.CertificateKind;
  const rows: [string, string][] = [
    [t("holder"), localized(certificate, "holder", locale)],
  ];
  if (kind === "qalam") {
    rows.push([t("school"), certificate.school ?? ""]);
    rows.push([t("year"), String(certificate.year ?? "")]);
  }
  rows.push([t("kind"), t(`kinds.${kind}`)]);
  if (kind === "prize" && certificate.prize_category) {
    rows.push([
      t("category"),
      t(`categories.${certificate.prize_category as "qirtas" | "qalam"}`),
    ]);
  }
  if (certificate.citation_en || certificate.citation_ar) {
    rows.push([t("citation"), localized(certificate, "citation", locale)]);
  }
  rows.push([t("issued"), date(certificate.issued_at)]);
  rows.push([t("serial"), certificate.serial ?? ""]);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-8 px-4 py-16">
      <PageHeader lede={t("lede")} title={t("title")} />
      <p className="text-text font-bold" role="status">
        {certificate.status === "revoked"
          ? t("revoked", { date: date(certificate.revoked_at) })
          : t("valid")}
      </p>
      <Rows rows={rows} />
      {certificate.serial ? (
        <figure className="grid justify-items-start gap-2">
          <Guilloche
            className="size-40"
            number={seedFromText(certificate.serial)}
            stroke="stroke-text"
          />
          <figcaption className="type-caption">{t("pattern")}</figcaption>
        </figure>
      ) : null}
      <p className="type-caption">{t(`signedBy.${kind}`)}</p>
    </div>
  );
};

export default CertificatePage;
