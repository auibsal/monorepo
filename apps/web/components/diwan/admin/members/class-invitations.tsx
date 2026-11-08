"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { localized, partners, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { OpenInvitations } from "@/components/diwan/partner/workspace";
import {
  type InviteeLanguage,
  InviteeLanguageField,
} from "../invitee-language";
import { ErrorLine, Field, SelectInput } from "../kit";

type ClassKind = "associate" | "honorary";

/**
 * Joining by class (decisions §2, §10): the Director of Membership invites
 * an Associate Member (faculty, staff, a friend of the Society) or, after
 * the Council's adopted resolution (F-34), an Honorary Member, each by a
 * single-use email invitation valid fourteen days. No invitation grants a
 * role or a seat.
 */
export const ClassInvitations = () => {
  const t = useTranslations("diwan.admin.members.classes");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ClassKind>("associate");
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState<InviteeLanguage>(
    locale === "ar" ? "ar" : "en"
  );
  const [resolution, setResolution] = useState("");
  const resolutions = useQuery({
    enabled: kind === "honorary",
    queryFn: () => partners.councilResolutions(supabase),
    queryKey: ["admin", "council-resolutions"],
  });
  const invite = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partner_invitations")
          .insert({
            email: email.trim(),
            kind,
            lang,
            resolution_id: kind === "honorary" ? resolution : null,
          })
      ),
    onSuccess: async () => {
      setEmail("");
      setResolution("");
      await queryClient.invalidateQueries({ queryKey: ["partner-desk"] });
    },
  });

  return (
    <div className="grid gap-6">
      <p className="type-caption">{t("hint")}</p>
      <form
        className="grid max-w-xl gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          invite.mutate();
        }}
      >
        <Field label={t("class")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setKind(e.target.value as ClassKind)}
              value={kind}
            >
              <option value="associate">{t("associate")}</option>
              <option value="honorary">{t("honorary")}</option>
            </SelectInput>
          )}
        </Field>
        {kind === "honorary" ? (
          <Field hint={t("resolutionHint")} label={t("resolution")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setResolution(e.target.value)}
                required
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
        ) : null}
        <Field label={t("email")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          )}
        </Field>
        <InviteeLanguageField onChange={setLang} value={lang} />
        <Button
          className="justify-self-start"
          disabled={invite.isPending || (kind === "honorary" && !resolution)}
          type="submit"
          variant="outline"
        >
          {t("invite")}
        </Button>
        {invite.isSuccess ? (
          <p className="type-caption" role="status">
            {t("sent")}
          </p>
        ) : null}
        <ErrorLine error={invite.error} />
      </form>
      <OpenInvitations kind="associate" partnerId={null} />
      <OpenInvitations kind="honorary" partnerId={null} />
    </div>
  );
};
