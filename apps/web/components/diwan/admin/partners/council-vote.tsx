"use client";

import type { Locale } from "@repo/internationalization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { MySignature } from "@/components/signature";
import { useAuth } from "@/lib/auth/provider";
import { localized, partners } from "@/lib/data";
import { EmptyLine } from "../../states";
import { ConfirmAction, ErrorLine, Field, SelectInput } from "../kit";

/**
 * The Council's vote on an application (decisions §10): its adopted
 * resolution, chosen from the Council's, is recorded on the memorandum,
 * the President countersigns as the authorized signatory, and the
 * organization becomes a partner. Nobody signs without the Council's vote.
 */
export const CouncilVote = ({
  agreementId,
  name,
  onDone,
}: {
  readonly agreementId: string;
  readonly name: string;
  readonly onDone?: () => void;
}) => {
  const t = useTranslations("diwan.admin.verification");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState("");
  const resolutions = useQuery({
    queryFn: () => partners.councilResolutions(supabase),
    queryKey: ["admin", "council-resolutions"],
  });
  const record = useMutation({
    mutationFn: () =>
      partners.recordCouncilVote(supabase, agreementId, resolution),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onDone?.();
    },
  });
  if (resolutions.data && resolutions.data.length === 0) {
    return <EmptyLine>{t("noResolution")}</EmptyLine>;
  }
  return (
    <div className="grid gap-3">
      <Field label={t("resolution")}>
        {(id) => (
          <SelectInput
            id={id}
            onChange={(e) => setResolution(e.target.value)}
            value={resolution}
          >
            {(resolutions.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.code} · ${localized(r, "title", locale)}`}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <div className="grid gap-1">
        <p className="type-label">{t("signingAs")}</p>
        <MySignature />
      </div>
      <div className="flex flex-wrap gap-2">
        <ConfirmAction
          confirmLabel={t("sign")}
          description={t("signConfirm", { name })}
          disabled={!resolution || record.isPending}
          onConfirm={() => record.mutate()}
          variant="default"
        >
          {t("sign")}
        </ConfirmAction>
      </div>
      <ErrorLine error={record.error} />
    </div>
  );
};
