"use client";

import { useTranslations } from "next-intl";
import { Agreement } from "@/components/agreement";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";

const SUMMARY = ["confidential", "noCopies", "stepAside"] as const;
const POINTS = ["confidential", "noCopies", "noSharing", "stepAside"] as const;

/**
 * The confidentiality agreement (confidentiality-agreement; decisions.md,
 * Qirtas: "everyone signs it before reading"), asked only of a role that
 * reads submissions: on the reading page before reading, and as its own
 * step on Today. Signed once in the reader's name, and again for a new
 * version.
 */
export const ConfidentialityAgreement = ({
  onSigned,
}: {
  readonly onSigned: () => void;
}) => {
  const t = useTranslations("diwan.admin.pipeline.pledge");
  const { supabase } = useAuth();
  return (
    <Agreement
      full={
        <ol className="grid list-decimal gap-1 ps-5">
          {POINTS.map((point) => (
            <li key={point}>{t(`points.${point}`)}</li>
          ))}
        </ol>
      }
      onSigned={onSigned}
      sign={async (esignAgreed) => {
        unwrap(
          await supabase
            .schema("api")
            .rpc("sign_reader_pledge", { esign_agreed: esignAgreed })
        );
        return null;
      }}
      summary={SUMMARY.map((point) => t(`summary.${point}`))}
      title={t("title")}
    />
  );
};
