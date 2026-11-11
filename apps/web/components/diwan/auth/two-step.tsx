"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";
import { DiwanSection } from "../page";
import { SectionSpinner } from "../states";

/** The sign-in methods that are already two factors (decisions.md, Members). */
const PASSKEY_METHODS = new Set(["passkey", "webauthn", "mfa/webauthn"]);

/**
 * Two-step sign-in (decisions.md, Members): an authenticator app (TOTP),
 * offered to everyone and required for officers, Council seats and every
 * role that sees personal data (access.has_permission checks the session).
 * A passkey sign-in meets it on its own.
 */
export const useTwoStep = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const [needs, from, level, factors] = await Promise.all([
        supabase.schema("access").rpc("needs_two_step"),
        supabase.schema("access").rpc("two_step_from"),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      const verified = (factors.data?.totp ?? []).find(
        (factor) => factor.status === "verified"
      );
      const methods = level.data?.currentAuthenticationMethods ?? [];
      return {
        done:
          level.data?.currentLevel === "aal2" ||
          methods.some((entry) =>
            PASSKEY_METHODS.has(
              typeof entry === "string" ? entry : entry.method
            )
          ),
        factorId: verified?.id ?? null,
        from: (unwrap(from) as string | null) ?? null,
        needs: Boolean(unwrap(needs)),
      };
    },
    queryKey: ["two-step", user?.id ?? ""],
  });
};

interface Enrolling {
  id: string;
  qr: string;
  secret: string;
}

/** Adding an authenticator app, then confirming its first code. */
const useSetup = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [failed, setFailed] = useState(false);

  const enroll = useMutation({
    mutationFn: async () => {
      // A half-finished setup leaves an unverified factor; clear it first.
      const { data } = await supabase.auth.mfa.listFactors();
      for (const factor of data?.all ?? []) {
        if (factor.status === "unverified") {
          // biome-ignore lint/performance/noAwaitInLoops: at most a couple
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "SAL",
      });
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    onError: () => setFailed(true),
    onSuccess: (data) =>
      setEnrolling({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      }),
  });

  const verify = useMutation({
    mutationFn: async ({ code, id }: { code: string; id: string }) => {
      const result = await supabase.auth.mfa.challengeAndVerify({
        code,
        factorId: id,
      });
      if (result.error) {
        throw result.error;
      }
    },
    onError: () => setFailed(true),
    // The session now carries aal2: every permission check changes.
    onSuccess: async () => {
      setEnrolling(null);
      await queryClient.invalidateQueries();
    },
  });

  return {
    enroll: () => {
      setFailed(false);
      enroll.mutate();
    },
    enrolling,
    enrollPending: enroll.isPending,
    failed,
    verify: (code: string, id: string) => {
      setFailed(false);
      verify.mutate({ code, id });
    },
    verifyPending: verify.isPending,
  };
};

type Setup = ReturnType<typeof useSetup>;

/** The start button, the QR code and the code form, as far as they apply. */
const SetupSteps = ({
  factorId,
  setup,
}: {
  factorId: string | null;
  setup: Setup;
}) => {
  const t = useTranslations("diwan.twoStep");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "")
      .replace(/\s/gu, "")
      .trim();
    if (factorId) {
      setup.verify(code, factorId);
    }
  };
  return (
    <>
      {factorId ? null : (
        <Button
          className="justify-self-start"
          disabled={setup.enrollPending}
          onClick={setup.enroll}
        >
          {t("start")}
        </Button>
      )}
      {setup.enrolling ? (
        <>
          <div className="grid gap-3" data-theme="light">
            <div className="border-line bg-surface justify-self-start border p-2">
              {/* biome-ignore lint/performance/noImgElement: Supabase returns the QR as an SVG data URL */}
              <img
                alt={t("qrAlt")}
                height={176}
                src={setup.enrolling.qr}
                width={176}
              />
            </div>
          </div>
          <p className="type-caption">
            {t("manual")}{" "}
            <code className="type-code break-all">
              {setup.enrolling.secret}
            </code>
          </p>
        </>
      ) : null}
      {factorId ? (
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="two-step-code">{t("codeLabel")}</Label>
            <Input
              autoComplete="one-time-code"
              className="max-w-48 font-mono text-lg tracking-widest"
              id="two-step-code"
              inputMode="numeric"
              maxLength={7}
              name="code"
              pattern="[0-9 ]{6,7}"
              required
            />
          </div>
          <Button
            className="justify-self-start"
            disabled={setup.verifyPending}
            type="submit"
          >
            {t("verify")}
          </Button>
        </form>
      ) : null}
      {setup.failed ? (
        <p className="type-body font-medium" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </>
  );
};

/**
 * Stands in the way of a page that needs two steps now: set up the app, or
 * enter its code after signing in, or use a recovery code.
 */
export const TwoStepPanel = () => {
  const t = useTranslations("diwan.twoStep");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const state = useTwoStep();
  const setup = useSetup();
  const [recovering, setRecovering] = useState(false);

  // A recovery code removes the lost authenticator; the panel then offers
  // to set up a new one.
  const recover = useMutation({
    mutationFn: (code: string) =>
      callApi(supabase, "/two-step/recover", { code }),
    onSuccess: async () => {
      setRecovering(false);
      await queryClient.invalidateQueries({ queryKey: ["two-step"] });
    },
  });

  if (state.isPending) {
    return <SectionSpinner />;
  }
  if (!state.data?.needs || state.data.done) {
    return null;
  }
  const factorId = setup.enrolling?.id ?? state.data.factorId;

  return (
    <section
      aria-labelledby="two-step-title"
      className="border-line pt-space-4 grid max-w-xl gap-4 border-t"
    >
      <h2 className="type-heading" id="two-step-title">
        {factorId ? t("verifyTitle") : t("setupTitle")}
      </h2>
      <p className="type-body">{factorId ? t("verifyBody") : t("setupBody")}</p>
      <SetupSteps factorId={factorId} setup={setup} />
      {factorId && !setup.enrolling ? (
        <RecoveryCodeForm
          failed={recover.isError}
          onSubmit={(code) => recover.mutate(code)}
          onToggle={() => setRecovering(!recovering)}
          open={recovering}
          pending={recover.isPending}
        />
      ) : null}
    </section>
  );
};

/**
 * Settings, for everyone: whether two-step is on, the offer to set it up,
 * and the date a role of theirs starts to need it.
 */
export const TwoStepSettings = () => {
  const t = useTranslations("diwan.twoStep");
  const locale = useLocale();
  const state = useTwoStep();
  const setup = useSetup();
  if (!state.data) {
    return null;
  }
  if (state.data.factorId && !setup.enrolling) {
    return (
      <DiwanSection id="two-step" title={t("settingsTitle")}>
        <p className="type-body">
          {state.data.done ? t("settingsOn") : t("settingsOnNextTime")}
        </p>
      </DiwanSection>
    );
  }
  const { from } = state.data;
  return (
    <DiwanSection id="two-step" title={t("settingsTitle")}>
      <div className="grid max-w-xl gap-4">
        <p className="type-body">
          {from
            ? t("settingsFrom", { date: formatLongDate(from, locale) })
            : t("settingsOffer")}
        </p>
        <SetupSteps factorId={setup.enrolling?.id ?? null} setup={setup} />
      </div>
    </DiwanSection>
  );
};

/** "Lost your phone?": one recovery code instead of the app's code. */
const RecoveryCodeForm = ({
  failed,
  onSubmit,
  onToggle,
  open,
  pending,
}: {
  failed: boolean;
  onSubmit: (code: string) => void;
  onToggle: () => void;
  open: boolean;
  pending: boolean;
}) => {
  const t = useTranslations("diwan.twoStep");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(String(new FormData(event.currentTarget).get("recovery") ?? ""));
  };
  return (
    <div className="border-line pt-space-3 grid gap-3 border-t">
      <Button
        aria-expanded={open}
        className="justify-self-start px-0"
        onClick={onToggle}
        type="button"
        variant="link"
      >
        {t("lost")}
      </Button>
      {open ? (
        <form className="grid gap-3" onSubmit={submit}>
          <p className="type-body">{t("recoveryBody")}</p>
          <div className="grid gap-2">
            <Label htmlFor="two-step-recovery">{t("recoveryLabel")}</Label>
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="max-w-64 font-mono tracking-widest"
              dir="ltr"
              id="two-step-recovery"
              name="recovery"
              required
              spellCheck={false}
            />
          </div>
          <Button
            className="justify-self-start"
            disabled={pending}
            type="submit"
            variant="outline"
          >
            {t("recoveryUse")}
          </Button>
          {failed ? (
            <p className="type-body font-medium" role="alert">
              {t("recoveryFailed")}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
};
