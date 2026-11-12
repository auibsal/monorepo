import { Guilloche, seedFromText } from "@repo/brand/components/sal/guilloche";
import type { Locale } from "@repo/internationalization";
import { localizedPath } from "@repo/internationalization";
import { formatPlainDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { pageWithinRateLimit, VERIFY_LIMIT } from "@/lib/api/rate-limit";
import { localized, membership, recognition } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { readLive } from "@/lib/supabase";

// Read live on each visit, after the visitor's limit: a revoked
// certificate shows at once, and codes can't be guessed in bulk.
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
 * revoked), what was awarded and when; a service letter (service-letter), who it is
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

const TooMany = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.verify" });
  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
      <PageHeader lede={t("tooMany")} title={t("title")} />
    </div>
  );
};

/** The certificate or letter a code names, once the visitor is within the limit. */
const lookUp = async (code: string) => {
  if (!CODE.test(code)) {
    return [null, null, null] as const;
  }
  if (!(await pageWithinRateLimit("verify", VERIFY_LIMIT))) {
    return "limited" as const;
  }
  return Promise.all([
    readLive((c) => recognition.verifyCertificate(c, code), null),
    readLive((c) => recognition.verifyServiceLetter(c, code), null),
    readLive((c) => recognition.verifyAgreement(c, code), null),
  ]);
};

const LetterCheck = async ({
  letter,
  locale,
}: {
  letter: NonNullable<
    Awaited<ReturnType<typeof recognition.verifyServiceLetter>>
  >;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.verify" });
  const date = (value: string | null) =>
    value ? formatPlainDate(value, locale) : "";
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
};

const AgreementCheck = async ({
  agreement,
  locale,
}: {
  agreement: NonNullable<
    Awaited<ReturnType<typeof recognition.verifyAgreement>>
  >;
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.verify" });
  const rows: [string, string][] = [
    [t("agreement"), localized(agreement, "title", locale)],
    [
      t("agreementName"),
      `${agreement.kind} · ${t("version", { version: String(agreement.version) })}`,
    ],
    [t("reference"), agreement.reference ?? ""],
    [t("signer"), agreement.signer_name ?? ""],
    [t("signed"), formatPlainDate(agreement.signed_at, locale)],
    [t("fingerprint"), agreement.document_sha256 ?? ""],
  ];
  return (
    <div className="mx-auto grid w-full max-w-xl gap-8 px-4 py-16">
      <PageHeader lede={t("lede")} title={t("title")} />
      <p className="text-text font-bold" role="status">
        {agreement.withdrawn_at
          ? t("agreementWithdrawn", {
              date: formatPlainDate(agreement.withdrawn_at, locale),
            })
          : t("agreementValid")}
      </p>
      <Rows rows={rows} />
      <p className="type-caption">{t("agreementSignedOn")}</p>
    </div>
  );
};

const CertificatePage = async ({ params }: CertificateParams) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.verify" });
  const found = await lookUp(code);
  if (found === "limited") {
    return <TooMany locale={locale} />;
  }
  const [certificate, letter, agreement] = found;

  if (
    !(certificate || letter || agreement) &&
    membership.CARD_CODE.test(code)
  ) {
    redirect(localizedPath(locale, membership.cardPath(code)));
  }
  const date = (value: string | null) =>
    value ? formatPlainDate(value, locale) : "";

  // A signed agreement or consent (decisions.md, Documents and forms): its
  // kind and version, its record number, who signed and when; never its
  // answers.
  if (agreement && !(certificate || letter)) {
    return <AgreementCheck agreement={agreement} locale={locale} />;
  }

  // A service letter: who, for what, when, and whether it stands.
  if (letter && !certificate) {
    return <LetterCheck letter={letter} locale={locale} />;
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
