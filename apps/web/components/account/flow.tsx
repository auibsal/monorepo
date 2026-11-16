"use client";

import {
  FlowSteps,
  Receipt,
  type ReviewWords,
} from "@repo/brand/components/sal/form-flow";
import { CallDetails } from "@repo/brand/components/sal/open-call";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { flow } from "@/lib/data";

/** The review step's words, the same on every form. */
export const useReviewWords = (): ReviewWords => {
  const t = useTranslations("diwan.flow.review");
  return {
    back: t("back"),
    open: t("open"),
    send: t("send"),
    sending: t("sending"),
    title: t("title"),
  };
};

/**
 * Where a record stands in Your account (decisions.md, The site: "One form
 * flow"): its flow's steps in the shared words, the decision named plainly.
 */
export const StatusLine = ({
  kind,
  status,
}: {
  readonly kind: flow.FlowKind;
  readonly status: string;
}) => {
  const t = useTranslations("diwan.flow");
  const at = flow.flowStatus(kind, status);
  if (at.step === "withdrawn") {
    return <p className="type-caption">{t("steps.withdrawn")}</p>;
  }
  const steps = flow.flowSteps[kind].map((key) => ({
    key,
    label:
      key === "decision" && at.decision
        ? t(`decisions.${at.decision}`)
        : t(`steps.${key}`),
  }));
  return <FlowSteps current={at.step} label={t("label")} steps={steps} />;
};

/**
 * The receipt on the page, with the record number and the reply time; the
 * record is then in Your account.
 */
export const FlowReceipt = ({
  href,
  more,
  reference,
  reply,
}: {
  /** Where the record is in Your account. */
  readonly href: string;
  /** A second action, after the first ("See the other roles"). */
  readonly more?: ReactNode;
  readonly reference: string | null | undefined;
  readonly reply: ReactNode;
}) => {
  const t = useTranslations("diwan.flow.receipt");
  return (
    <Receipt
      actions={
        <>
          <Link className="link font-medium" href={href}>
            {t("open")}
          </Link>
          {more}
        </>
      }
      email={t("email")}
      number={reference ? t("number", { number: reference }) : undefined}
      reply={reply}
      title={t("title")}
    />
  );
};

/**
 * A call's terms after its action (decisions.md, The site: "One call
 * page"), for the Society's own calls: auditions, the partner
 * application and nominations.
 */
export const FlowTerms = ({
  closesAt,
  kind,
}: {
  readonly closesAt?: string;
  readonly kind: "audition" | "nomination" | "partner";
}) => {
  const t = useTranslations("diwan.flow.terms");
  const tr = useTranslations("diwan.flow.reply");
  const locale = useLocale();
  const date = closesAt ? formatLongDate(closesAt, locale) : "";
  const rows: [string, string][] = [
    [t("who"), t(`${kind}.who`)],
    [t("what"), t(`${kind}.what`)],
  ];
  if (kind === "nomination") {
    rows.push([t("dates"), t("nomination.dates", { date })]);
  }
  rows.push([t("decided"), t(`${kind}.decided`)]);
  rows.push([
    t("reply"),
    kind === "nomination" ? tr("nomination", { date }) : tr(kind),
  ]);
  if (kind === "partner") {
    rows.push([t("fees"), t("partner.fees")]);
  }
  return (
    <section aria-label={t("title")} className="grid gap-4">
      <h2 className="type-heading" id={`terms-${kind}`}>
        {t("title")}
      </h2>
      <CallDetails rows={rows} />
    </section>
  );
};
