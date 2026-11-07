"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { useRouter } from "@repo/internationalization/navigation";
import { forms, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { ErrorLine, Field, SelectInput } from "../admin/kit";
import { DiwanPage } from "../page";
import { EmptyLine } from "../states";
import { FormFieldInput, type FormLabels, useFormLabels } from "./field";

type Data = forms.FormData;
type FormField = forms.FormField;

const numeric = (field: FormField) => field.type === "number";

const toNumber = (value: unknown) =>
  value === "" || value === undefined || value === null ? null : Number(value);

const normalizeRow = (columns: readonly FormField[], row: Data) =>
  Object.fromEntries(
    columns.map((col) => [
      col.key,
      numeric(col) ? toNumber(row[col.key]) : row[col.key],
    ])
  );

/** Numbers stored as numbers, empty values dropped. */
const normalize = (fields: readonly FormField[], data: Data): Data => {
  const out: Data = {};
  for (const field of fields) {
    const value = data[field.key];
    if (value === undefined || value === "") {
      continue;
    }
    if (numeric(field)) {
      out[field.key] = toNumber(value);
    } else if (field.type === "table" && Array.isArray(value)) {
      out[field.key] = value.map((row) =>
        normalizeRow(field.columns ?? [], row as Data)
      );
    } else if (field.type === "grid") {
      out[field.key] = Object.fromEntries(
        Object.entries((value ?? {}) as Record<string, Data>).map(
          ([row, cells]) => [row, normalizeRow(field.columns ?? [], cells)]
        )
      );
    } else {
      out[field.key] = value;
    }
  }
  return out;
};

const AnonymousOption = ({
  onChange,
  value,
}: {
  onChange: (value: boolean) => void;
  value: boolean;
}) => {
  const t = useTranslations("diwan.forms");
  return (
    <div className="grid gap-1">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={value}
          id="anonymous"
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <Label className="font-normal" htmlFor="anonymous">
          {t("anonymous")}
        </Label>
      </div>
      <p className="type-caption">{t("anonymousHint")}</p>
    </div>
  );
};

const ProblemsLine = ({
  labels,
  problems,
}: {
  labels: FormLabels;
  problems: string[];
}) => {
  const t = useTranslations("diwan.forms");
  return problems.length > 0 ? (
    <p className="text-sm text-text" role="alert">
      {t("problems", {
        fields: problems.map((key) => labels.field(key)).join(" · "),
      })}
    </p>
  ) : null;
};

/**
 * A form on its own page, `/forms/<number>` (owner, Nov 7, 2026): filled in
 * and signed by typing a name, for members, guests, parents and partners
 * alike. The signed copy keeps the signer, the time and the form's version.
 * A form about an event (a trip's consent, a media release) names it with
 * `?event=<slug>`.
 */
export const FillForm = ({
  eventSlug = null,
  formKey,
}: {
  readonly eventSlug?: string | null;
  readonly formKey: string;
}) => {
  const t = useTranslations("diwan.forms");
  if (!forms.isFormKey(formKey)) {
    return (
      <EmptyLine action={{ href: "/", label: t("home") }}>
        {t("notFound")}
      </EmptyLine>
    );
  }
  return <FormEditor eventSlug={eventSlug} formKey={formKey} key={formKey} />;
};

/** The event a form names, by its address (RLS decides who sees it). */
const useNamedEvent = (slug: string | null) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(slug),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, slug, title_en, title_ar")
          .eq("slug", slug ?? "")
          .maybeSingle()
      ),
    queryKey: ["forms", "event", slug],
  });
};

const FormEditor = ({
  eventSlug,
  formKey,
}: {
  eventSlug: string | null;
  formKey: forms.FormKey;
}) => {
  const t = useTranslations("diwan.forms");
  const locale = useLocale() as Locale;
  const definition = forms.forms[formKey];
  const labels = useFormLabels(formKey);
  const { supabase, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const event = useNamedEvent(eventSlug);
  const me = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("profiles")
          .select("full_name_en, full_name_ar")
          .eq("id", user?.id ?? "")
          .maybeSingle()
      ),
    queryKey: ["forms", "me", user?.id],
  });
  const [data, setData] = useState<Data>({});
  const [routing, setRouting] = useState<forms.Routing>("none");
  const [anonymous, setAnonymous] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [signer, setSigner] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  // A member signs in the name on their account, unless they change it.
  const myName = me.data
    ? (locale === "ar" && me.data.full_name_ar) || me.data.full_name_en
    : "";
  const signature = signer ?? myName;

  const sign = useMutation({
    mutationFn: () =>
      forms.signForm(supabase, {
        anonymous,
        data: normalize(definition.fields, data),
        form: formKey,
        routing,
        signerContact: user ? null : contact,
        signerName: anonymous ? "" : signature,
        subjectId: event.data?.id ?? null,
      }),
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      if (eventSlug && event.data) {
        router.push(`/events/${eventSlug}`);
        return;
      }
      if (user && !anonymous) {
        router.push(`/membership/requests/${savedId}`);
        return;
      }
      setSent(true);
    },
  });

  if (sent) {
    return (
      <EmptyLine action={{ href: "/", label: t("home") }}>
        {anonymous ? t("sentAnonymously") : t("signed")}
      </EmptyLine>
    );
  }
  if (eventSlug && event.isSuccess && !event.data) {
    return (
      <EmptyLine action={{ href: "/events", label: t("whatsOn") }}>
        {t("noEvent")}
      </EmptyLine>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = forms.formProblems(definition, data);
    if (!(anonymous || signature.trim().length >= 2)) {
      found.push("signature");
    }
    setProblems(found);
    if (found.length === 0) {
      sign.mutate();
    }
  };

  return (
    <DiwanPage lede={labels.purpose()} narrow title={labels.title()}>
      <p className="type-caption font-mono" dir="ltr">
        {`SAL-EXB-01 · ${definition.code}`}
      </p>
      {event.data ? (
        <p className="type-body">
          {t("forEvent", {
            title:
              (locale === "ar" && event.data.title_ar) || event.data.title_en,
          })}
        </p>
      ) : null}
      {definition.preamble ? (
        <p className="type-body bg-surface-reading p-5">{labels.preamble()}</p>
      ) : null}

      <form className="grid gap-5" noValidate onSubmit={onSubmit}>
        {definition.routing ? (
          <Field hint={t("routingHint")} label={t("routing")}>
            {(fieldId) => (
              <SelectInput
                id={fieldId}
                onChange={(e) => setRouting(e.target.value as forms.Routing)}
                value={routing}
              >
                {forms.routings.map((r) => (
                  <option key={r} value={r}>
                    {t(`routings.${r}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        ) : null}
        {definition.fields.map((field) => (
          <FormFieldInput
            field={field}
            invalid={problems.includes(field.key)}
            key={field.key}
            labels={labels}
            onChange={(value) => setData((d) => ({ ...d, [field.key]: value }))}
            value={data[field.key]}
          />
        ))}
        {definition.anonymous ? (
          <AnonymousOption onChange={setAnonymous} value={anonymous} />
        ) : null}
        {anonymous ? null : (
          <>
            <Field hint={t("signatureHint")} label={t("signature")}>
              {(fieldId) => (
                <Input
                  aria-invalid={problems.includes("signature")}
                  className="font-signature text-2xl"
                  id={fieldId}
                  maxLength={200}
                  onChange={(e) => setSigner(e.target.value)}
                  value={signature}
                />
              )}
            </Field>
            {user ? null : (
              <Field label={t("contact")}>
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    maxLength={200}
                    onChange={(e) => setContact(e.target.value)}
                    value={contact}
                  />
                )}
              </Field>
            )}
          </>
        )}
        <ProblemsLine
          labels={{
            ...labels,
            field: (key: string) =>
              key === "signature" ? t("signature") : labels.field(key),
          }}
          problems={problems}
        />
        <div className="flex flex-wrap gap-3">
          <Button disabled={sign.isPending} type="submit">
            {anonymous ? t("send") : t("signAndSend")}
          </Button>
        </div>
        <ErrorLine error={sign.error} />
      </form>
    </DiwanPage>
  );
};
