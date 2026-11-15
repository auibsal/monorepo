"use client";

import {
  FlowSteps,
  Receipt,
  type ReviewWords,
} from "@repo/brand/components/sal/form-flow";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
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
