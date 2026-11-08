"use client";

import { FormPage } from "@repo/brand/components/sal/form-page";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { apiPath } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useRouter } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { forms, unwrap } from "@/lib/data";
import { ApiError } from "@/lib/diwan/api";
import { ErrorLine, Field, SelectInput } from "../admin/kit";
import { useHumanCheck } from "../auth/human-check";
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

/** The refusals the form page can explain (governance.sign_form). */
const REFUSALS = new Set([
  "esign_agreement_required",
  "human_check_failed",
  "link_not_valid",
  "rate_limited",
  "sign_in_required",
]);

/** Signing without an account, or anonymously: through the API route. */
const signThroughApi = async (body: object) => {
  const response = await fetch(apiPath("/forms/sign"), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: string;
    id?: string;
  };
  if (!response.ok) {
    throw new ApiError(response.status, json.error ?? "request_failed");
  }
  return json.id ?? "";
};

const EsignAgreement = ({
  onChange,
  value,
}: {
  onChange: (value: boolean) => void;
  value: boolean;
}) => {
  const t = useTranslations("diwan.forms");
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        checked={value}
        id="esign"
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <Label className="font-normal" htmlFor="esign">
        {t("esignAgree")}
      </Label>
    </div>
  );
};

/** Signs in the member's name, or through the API route when signed out
 * or anonymous (Turnstile; governance.sign_form either way). */
const sendForm = (
  supabase: ReturnType<typeof useAuth>["supabase"],
  input: {
    agreed: boolean;
    anonymous: boolean;
    contact: string | null;
    data: Data;
    formKey: forms.FormKey;
    link: string | null;
    routing: forms.Routing;
    signature: string;
    subjectId: string | null;
    throughApi: boolean;
    token: string | undefined;
  }
) => {
  if (!input.throughApi) {
    return forms.signForm(supabase, {
      data: input.data,
      esignAgreed: input.agreed,
      form: input.formKey,
      routing: input.routing,
      signerName: input.signature,
      subjectId: input.subjectId,
    });
  }
  return signThroughApi({
    anonymous: input.anonymous,
    data: input.data,
    esign_agreed: !input.anonymous && input.agreed,
    form: input.formKey,
    link: input.link,
    routing: input.routing,
    signer_contact: input.contact,
    signer_name: input.anonymous ? "" : input.signature,
    subject_id: input.subjectId,
    token: input.token,
  });
};

/** Who signs and how: anonymous, a contact, "I agree", the human check. */
const SignerFields = ({
  agreed,
  allowAnonymous,
  anonymous,
  contact,
  human,
  onAgreed,
  onAnonymous,
  onContact,
  signedIn,
}: {
  agreed: boolean;
  allowAnonymous: boolean;
  anonymous: boolean;
  contact: string;
  human: ReactNode;
  onAgreed: (value: boolean) => void;
  onAnonymous: (value: boolean) => void;
  onContact: (value: string) => void;
  signedIn: boolean;
}) => {
  const t = useTranslations("diwan.forms");
  return (
    <>
      {allowAnonymous ? (
        <AnonymousOption onChange={onAnonymous} value={anonymous} />
      ) : null}
      {anonymous || signedIn ? null : (
        <Field label={t("contact")}>
          {(fieldId) => (
            <Input
              id={fieldId}
              maxLength={200}
              onChange={(e) => onContact(e.target.value)}
              value={contact}
            />
          )}
        </Field>
      )}
      {anonymous ? null : <EsignAgreement onChange={onAgreed} value={agreed} />}
      {human}
    </>
  );
};

/** What still needs doing before a form can be signed. */
const signingProblems = (
  definition: forms.FormDefinition,
  data: Data,
  sign: { agreed: boolean; anonymous: boolean; signature: string }
) => {
  const found = forms.formProblems(definition, data);
  if (!(sign.anonymous || sign.signature.trim().length >= 2)) {
    found.push("signature");
  }
  if (!(sign.anonymous || sign.agreed)) {
    found.push("esign");
  }
  return found;
};

/** The problems line, then a refusal the page can explain, or the error. */
const SignProblems = ({
  error,
  labels,
  problems,
}: {
  error: Error | null;
  labels: FormLabels;
  problems: string[];
}) => {
  const t = useTranslations("diwan.forms");
  const refusal =
    error instanceof ApiError && REFUSALS.has(error.code) ? error.code : null;
  return (
    <>
      <ProblemsLine
        labels={{
          ...labels,
          field: (key: string) => {
            if (key === "signature") {
              return t("signature");
            }
            return key === "esign" ? t("esignField") : labels.field(key);
          },
        }}
        problems={problems}
      />
      {refusal ? (
        <p className="type-body font-medium" role="alert">
          {t(`refusals.${refusal}` as never)}
        </p>
      ) : (
        <ErrorLine error={error} />
      )}
    </>
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
    <p className="text-text text-sm" role="alert">
      {t("problems", {
        fields: problems.map((key) => labels.field(key)).join(" · "),
      })}
    </p>
  ) : null;
};

/**
 * A form on its own page, `/forms/<number>` (decisions.md): filled in
 * and signed by typing a name, for members, guests, parents and partners
 * alike. The signed copy keeps the signer, the time and the form's version.
 * A form about an event (a trip's consent, a media release) names it with
 * `?event=<slug>`.
 */
export const FillForm = ({
  eventSlug = null,
  formKey,
  link = null,
}: {
  readonly eventSlug?: string | null;
  readonly formKey: string;
  /** A parent's single-use link (?link=), for a form signed only by link. */
  readonly link?: string | null;
}) => {
  const t = useTranslations("diwan.forms");
  if (!forms.isFormKey(formKey)) {
    return (
      <EmptyLine action={{ href: "/", label: t("home") }}>
        {t("notFound")}
      </EmptyLine>
    );
  }
  if (forms.forms[formKey].byLink && !link) {
    return (
      <EmptyLine action={{ href: "/", label: t("home") }}>
        {t("needsLink")}
      </EmptyLine>
    );
  }
  return (
    <FormEditor
      eventSlug={eventSlug}
      formKey={formKey}
      key={formKey}
      link={link}
    />
  );
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
  link,
}: {
  eventSlug: string | null;
  formKey: forms.FormKey;
  link: string | null;
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
  const [agreed, setAgreed] = useState(false);
  const [sent, setSent] = useState(false);
  // Signed out or anonymous: Turnstile, checked by /api/forms/sign.
  const human = useHumanCheck("form");
  const throughApi = !user || anonymous;
  // A member signs in the name on their account, unless they change it.
  const myName = me.data
    ? (locale === "ar" && me.data.full_name_ar) || me.data.full_name_en
    : "";
  const signature = signer ?? myName;

  const sign = useMutation({
    mutationFn: () =>
      sendForm(supabase, {
        agreed,
        anonymous,
        contact: user ? null : contact,
        data: normalize(definition.fields, data),
        formKey,
        link,
        routing,
        signature,
        subjectId: event.data?.id ?? null,
        throughApi,
        token: human.token,
      }),
    onError: () => human.reset(),
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: ["forms"] });
      if (eventSlug && event.data) {
        router.push(`/events/${eventSlug}`);
        return;
      }
      if (user && !anonymous) {
        router.push(`/account/requests/${savedId}`);
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
    const found = signingProblems(definition, data, {
      agreed,
      anonymous,
      signature,
    });
    setProblems(found);
    if (found.length === 0) {
      sign.mutate();
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <FormPage
        code={`SAL-EXB-01 · ${definition.code}`}
        date={formatLongDate(new Date(), locale, true)}
        dateLabel={t("date")}
        kept={t("kept")}
        notice={
          definition.preamble ? (
            <p className="type-body">{labels.preamble()}</p>
          ) : undefined
        }
        onSubmit={onSubmit}
        pending={sign.isPending || (throughApi && !human.ready)}
        purpose={labels.purpose()}
        signature={{
          hint: t("signatureHint"),
          invalid: problems.includes("signature"),
          label: t("signature"),
          omit: anonymous,
          onChange: setSigner,
          value: signature,
        }}
        submit={anonymous ? t("send") : t("signAndSend")}
        title={labels.title()}
      >
        {event.data ? (
          <p className="type-body">
            {t("forEvent", {
              title:
                (locale === "ar" && event.data.title_ar) || event.data.title_en,
            })}
          </p>
        ) : null}
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
        <SignerFields
          agreed={agreed}
          allowAnonymous={Boolean(definition.anonymous)}
          anonymous={anonymous}
          contact={contact}
          human={throughApi ? human.element : null}
          onAgreed={setAgreed}
          onAnonymous={setAnonymous}
          onContact={setContact}
          signedIn={Boolean(user)}
        />
        <SignProblems error={sign.error} labels={labels} problems={problems} />
      </FormPage>
    </div>
  );
};
