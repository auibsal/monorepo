"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MySignature } from "@/components/signature";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { ErrorLine } from "../admin/kit";

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
  const tf = useTranslations("diwan.forms");
  const { supabase } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const sign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .rpc("sign_reader_pledge", { esign_agreed: agreed })
      ),
    onSuccess: onSigned,
  });
  return (
    <section className="border-line grid max-w-2xl gap-3 border-t pt-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <ul className="grid list-disc gap-1 ps-5">
        {POINTS.map((point) => (
          <li key={point}>{t(`points.${point}`)}</li>
        ))}
      </ul>
      <MySignature />
      <div className="flex items-start gap-2">
        <Checkbox
          checked={agreed}
          id="pledge-esign"
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <Label className="font-normal" htmlFor="pledge-esign">
          {tf("esignAgree")}
        </Label>
      </div>
      <Button
        className="justify-self-start"
        disabled={!agreed || sign.isPending}
        onClick={() => sign.mutate()}
      >
        {t("agree")}
      </Button>
      <ErrorLine error={sign.error} />
    </section>
  );
};
