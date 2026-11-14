"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { membership } from "@/lib/data";
import { useMyAddresses } from "@/lib/diwan/queries";
import { ChoiceInput } from "../admin/choice-input";

const NOT_DIGITS = /\D/gu;

/** Refreshes everything that follows the address and the class. */
const useRefresh = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
};

/** Why a step was refused, in words. */
const Refusal = ({ error }: { error: unknown }) => {
  const t = useTranslations("diwan.addresses.errors");
  if (!error) {
    return null;
  }
  return (
    <p className="text-text" role="alert">
      {t(membership.addressError(error))}
    </p>
  );
};

/** One line to type an address or a code, and its button. */
const OneLine = ({
  button,
  code = false,
  disabled,
  label,
  onSubmit,
}: {
  readonly button: string;
  readonly code?: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly onSubmit: (value: string) => void;
}) => {
  const id = useId();
  const [value, setValue] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };
  return (
    <form className="grid gap-2" onSubmit={submit}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          autoComplete={code ? "one-time-code" : "email"}
          className={code ? "max-w-[12ch]" : "max-w-sm"}
          dir="ltr"
          id={id}
          inputMode={code ? "numeric" : "email"}
          maxLength={code ? 6 : undefined}
          onChange={(event) =>
            setValue(
              code
                ? event.target.value.replace(NOT_DIGITS, "")
                : event.target.value
            )
          }
          type={code ? "text" : "email"}
          value={value}
        />
        <Button
          disabled={disabled || !value.trim()}
          type="submit"
          variant="outline"
        >
          {button}
        </Button>
      </div>
    </form>
  );
};

/**
 * An AUIB address added later (decisions.md, Members): someone who signed
 * up with another address, or a guest who comes to AUIB. A code goes to
 * the AUIB address; typed in, the AUIB address becomes the sign-in, the
 * old one the personal email, and the class follows the AUIB address. An
 * AUIB address that already has an account is the same person's other
 * account: they can ask to merge the two.
 */
export const AuibAddress = () => {
  const t = useTranslations("diwan.addresses.auib");
  const { supabase } = useAuth();
  const { data } = useMyAddresses();
  const refresh = useRefresh();
  const [asked, setAsked] = useState("");
  const send = useMutation({
    mutationFn: (email: string) => {
      setAsked(email);
      return membership.requestAuibAddress(supabase, email);
    },
    onSuccess: refresh,
  });
  const confirm = useMutation({
    mutationFn: (code: string) => membership.confirmAuibAddress(supabase, code),
    onSuccess: refresh,
  });
  const merge = useMutation({
    mutationFn: () => membership.requestMerge(supabase, asked),
    onSuccess: refresh,
  });
  if (!data || data.sign_in_auib) {
    return null;
  }
  const hasAccount =
    send.isError && membership.addressError(send.error) === "email_has_account";
  return (
    <div className="grid gap-4">
      <p className="type-caption max-w-[60ch]">{t("why")}</p>
      {data.auib_pending ? (
        <div className="grid gap-3">
          <p className="type-body" role="status">
            {t("sent", { email: data.auib_pending })}
          </p>
          <OneLine
            button={t("confirm")}
            code
            disabled={confirm.isPending}
            label={t("code")}
            onSubmit={(code) => confirm.mutate(code)}
          />
          <Refusal error={confirm.error} />
        </div>
      ) : (
        <div className="grid gap-3">
          <OneLine
            button={t("send")}
            disabled={send.isPending}
            label={t("label")}
            onSubmit={(email) => send.mutate(email)}
          />
          <Refusal error={send.error} />
          {hasAccount ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={merge.isPending}
                onClick={() => merge.mutate()}
                size="sm"
                variant="outline"
              >
                {t("merge")}
              </Button>
              <Refusal error={merge.error} />
            </div>
          ) : null}
        </div>
      )}
      {confirm.isSuccess ? (
        <p className="type-body" role="status">
          {t(confirm.data === "member" ? "nowMember" : "nowAssociate")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Two accounts, one person (decisions.md, Members): from this account the
 * person proves the other's address with a code; the Director of
 * Membership approves, and the two become one, keeping the older number.
 */
export const MergeAccounts = () => {
  const t = useTranslations("diwan.addresses.merge");
  const { supabase } = useAuth();
  const { data } = useMyAddresses();
  const refresh = useRefresh();
  const send = useMutation({
    mutationFn: (email: string) => membership.requestMerge(supabase, email),
    onSuccess: refresh,
  });
  const prove = useMutation({
    mutationFn: (code: string) => membership.proveMerge(supabase, code),
    onSuccess: refresh,
  });
  const withdraw = useMutation({
    mutationFn: () => membership.withdrawMerge(supabase),
    onSuccess: refresh,
  });
  if (!data) {
    return null;
  }
  return (
    <div className="grid gap-4">
      <p className="type-caption max-w-[60ch]">{t("why")}</p>
      {data.merge_pending ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="type-body" role="status">
            {t("waiting", { email: data.merge_pending })}
          </p>
          <Button
            className="text-text-secondary px-0"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate()}
            variant="link"
          >
            {t("withdraw")}
          </Button>
        </div>
      ) : null}
      {!data.merge_pending && data.merge_code_sent ? (
        <div className="grid gap-3">
          <p className="type-body" role="status">
            {t("sent", { email: data.merge_code_sent })}
          </p>
          <OneLine
            button={t("confirm")}
            code
            disabled={prove.isPending}
            label={t("code")}
            onSubmit={(code) => prove.mutate(code)}
          />
          <Refusal error={prove.error} />
        </div>
      ) : null}
      {data.merge_pending || data.merge_code_sent ? null : (
        <div className="grid gap-3">
          <OneLine
            button={t("send")}
            disabled={send.isPending}
            label={t("label")}
            onSubmit={(email) => send.mutate(email)}
          />
          <Refusal error={send.error} />
        </div>
      )}
    </div>
  );
};

/**
 * Leaving AUIB (decisions.md, Members): the person says so here, or the
 * Director of Membership records it, whichever comes first. They become an
 * Associate (no vote, no seat); a confirmed personal email becomes the
 * sign-in.
 */
export const LeavingAuib = () => {
  const t = useTranslations("diwan.addresses.leaving");
  const { supabase } = useAuth();
  const { data } = useMyAddresses();
  const refresh = useRefresh();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [graduated, setGraduated] = useState<"" | "no" | "yes">("");
  const leave = useMutation({
    mutationFn: () => membership.reportLeaving(supabase, graduated === "yes"),
    onSuccess: refresh,
  });
  if (leave.isSuccess) {
    return (
      <p className="type-body" role="status">
        {t("done")}
      </p>
    );
  }
  if (
    data?.tier !== "member" ||
    !(data.sign_in_auib && data.student) ||
    data.left_auib_at
  ) {
    return null;
  }
  return (
    <div className="grid gap-3">
      <p className="type-caption max-w-[60ch]">{t("why")}</p>
      {open ? (
        <div className="grid gap-3">
          <p className="type-body max-w-[60ch]">
            {data.personal_verified ? t("withPersonal") : t("withoutPersonal")}
          </p>
          <Label htmlFor={id}>{t("question")}</Label>
          <ChoiceInput
            id={id}
            onChange={(event) =>
              setGraduated(event.target.value as "no" | "yes")
            }
            value={graduated}
          >
            <option value="yes">{t("graduated")}</option>
            <option value="no">{t("left")}</option>
          </ChoiceInput>
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="link"
              onClick={() => setOpen(false)}
              type="button"
            >
              {t("cancel")}
            </button>
            <Button
              disabled={leave.isPending || !graduated}
              onClick={() => leave.mutate()}
              size="sm"
              variant="outline"
            >
              {t("confirm")}
            </Button>
          </div>
          <Refusal error={leave.error} />
        </div>
      ) : (
        <Button
          className="justify-self-start px-0"
          onClick={() => setOpen(true)}
          variant="link"
        >
          {t("open")}
        </Button>
      )}
    </div>
  );
};
