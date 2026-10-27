"use client";

import { useAuth } from "@repo/auth/provider";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { localizedPath } from "@repo/internationalization";
import { useRouter } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { callApi } from "@/lib/nexus/api";
import { safeNextPath, stripLocale } from "@/lib/nexus/navigation";
import { postPass } from "@/lib/nexus/pass-api";
import { pkce, randomString } from "@/lib/nexus/pkce";
import { useScreenTop } from "@/lib/nexus/use-screen-top";
import { SignInForm } from "./sign-in-form";

const PENDING = "sal.pass-sign-in";
const TICKET = "sal.pass-ticket";

interface Pending {
  next: string | null;
  nonce: string;
  state: string;
  verifier: string;
}

/** The page the Pass returns to, in the page's language. */
const returnAddress = (locale: string) =>
  `${window.location.origin}${localizedPath(locale, "/auth/pass")}`;

/** Sign-in and sign-up both start here: one button to The IDEA Pass. */
export const PassSignIn = ({ forgot = false }: { forgot?: boolean }) => {
  const t = useTranslations("auth");
  const locale = useLocale();
  const next = safeNextPath(useSearchParams().get("next"));
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  const start = async () => {
    setPending(true);
    setFailed(false);
    try {
      const { challenge, verifier } = await pkce();
      const state = randomString();
      const nonce = randomString();
      const { url } = await postPass<{ url: string | null }>("/pass/start", {
        codeChallenge: challenge,
        locale,
        nonce,
        redirectUri: returnAddress(locale),
        state,
      });
      if (!url) {
        throw new Error("not_configured");
      }
      sessionStorage.setItem(
        PENDING,
        JSON.stringify({ next, nonce, state, verifier } satisfies Pending)
      );
      window.location.assign(url);
    } catch {
      setPending(false);
      setFailed(true);
    }
  };

  return (
    <>
      <FormHeader title={t("signIn.title")}>
        {forgot ? t("pass.forgot") : t("pass.lede")}
      </FormHeader>
      <Button disabled={pending} onClick={start} type="button">
        {t("pass.continue")}
      </Button>
      <p className="type-caption text-text-secondary">{t("pass.students")}</p>
      {failed ? (
        <p className="text-text" role="alert">
          {t("pass.unavailable")}
        </p>
      ) : null}
    </>
  );
};

type Screen =
  | { kind: "working" }
  | { kind: "failed"; code: string }
  | { kind: "unmatched"; email: string | null; ticket: string }
  | { kind: "existing"; ticket: string };

/**
 * Back from The IDEA Pass (/auth/pass?code=…&state=…): the API routes
 * verify who the Pass says this is and answer a one-time token for their
 * SAL account, which opens an ordinary session here. With no account found,
 * the person makes one, or signs in once the old way to the account they
 * have under another address, which links it.
 */
export const PassReturn = () => {
  const t = useTranslations("auth");
  const { supabase, user } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const params = useSearchParams();
  const [screen, setScreen] = useState<Screen>({ kind: "working" });
  const [next, setNext] = useState<string | null>(null);
  const started = useRef<boolean>(false);
  useScreenTop(screen.kind);

  const finish = async (tokenHash: string, to: string | null) => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (error) {
      setScreen({ code: "sign_in_failed", kind: "failed" });
      return;
    }
    router.replace(to ? stripLocale(to) : "/membership", { locale });
  };

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    // Back from the old sign-in's link (the linking step).
    const ticket = sessionStorage.getItem(TICKET);
    if (params.get("link") && ticket) {
      window.history.replaceState(null, "", window.location.pathname);
      setScreen({ kind: "existing", ticket });
      return;
    }
    const code = params.get("code");
    const state = params.get("state");
    const saved = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    window.history.replaceState(null, "", window.location.pathname);
    const pending = saved ? (JSON.parse(saved) as Pending) : null;
    if (!(code && pending && pending.state === state)) {
      setScreen({ code: params.get("error") ?? "expired", kind: "failed" });
      return;
    }
    setNext(pending.next);
    postPass<
      | { status: "signed_in"; tokenHash: string }
      | { status: "unmatched"; email: string | null; ticket: string }
    >("/pass/sign-in", {
      code,
      codeVerifier: pending.verifier,
      nonce: pending.nonce,
      redirectUri: returnAddress(locale),
    })
      .then((result) =>
        result.status === "signed_in"
          ? finish(result.tokenHash, pending.next)
          : setScreen({ ...result, kind: "unmatched" })
      )
      .catch((error: Error) =>
        setScreen({ code: error.message, kind: "failed" })
      );
  });

  // Linking: once the old sign-in has opened the account, link the Pass.
  useEffect(() => {
    if (screen.kind !== "existing" || !user) {
      return;
    }
    callApi(supabase, "/pass/link", { ticket: screen.ticket })
      .then(() => {
        sessionStorage.removeItem(TICKET);
        router.replace(next ? stripLocale(next) : "/membership", { locale });
      })
      .catch((error: Error & { code?: string }) =>
        setScreen({ code: error.code ?? "link_failed", kind: "failed" })
      );
  }, [locale, next, router, screen, supabase, user]);

  const create = async (ticket: string) => {
    setScreen({ kind: "working" });
    try {
      const result = await postPass<{ tokenHash: string }>("/pass/sign-in", {
        create: true,
        locale,
        ticket,
      });
      await finish(result.tokenHash, next);
    } catch (error) {
      setScreen({ code: (error as Error).message, kind: "failed" });
    }
  };

  if (screen.kind === "working") {
    return (
      <FormHeader title={t("pass.signingIn")}>{t("pass.wait")}</FormHeader>
    );
  }
  if (screen.kind === "failed") {
    return <PassFailed code={screen.code} />;
  }
  if (screen.kind === "existing") {
    return (
      <>
        <FormHeader title={t("pass.existingTitle")}>
          {t("pass.existingBody")}
        </FormHeader>
        <SignInForm embedded />
      </>
    );
  }
  return (
    <>
      <FormHeader title={t("pass.unmatchedTitle")}>
        {screen.email
          ? t.rich("pass.unmatchedBody", {
              address: screen.email,
              email: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
            })
          : t("pass.unmatchedNoEmail")}
      </FormHeader>
      <div className="grid justify-items-start gap-3">
        <Button onClick={() => create(screen.ticket)} type="button">
          {t("pass.create")}
        </Button>
        <Button
          className="px-0"
          onClick={() => {
            sessionStorage.setItem(TICKET, screen.ticket);
            setScreen({ kind: "existing", ticket: screen.ticket });
          }}
          type="button"
          variant="link"
        >
          {t("pass.existing")}
        </Button>
      </div>
      <p className="type-caption text-text-secondary">
        {t("pass.unmatchedHint")}
      </p>
    </>
  );
};

const FAILURES = ["linked_elsewhere", "no_email", "expired"] as const;
type Failure = (typeof FAILURES)[number];
const isFailure = (code: string): code is Failure =>
  (FAILURES as readonly string[]).includes(code);

const PassFailed = ({ code }: { code: string }) => {
  const t = useTranslations("auth");
  const router = useRouter();
  return (
    <>
      <FormHeader title={t("pass.failedTitle")}>
        {isFailure(code) ? t(`pass.errors.${code}`) : t("pass.errors.other")}
      </FormHeader>
      <Button
        className="justify-self-start"
        onClick={() => router.replace("/sign-in")}
        type="button"
      >
        {t("pass.tryAgain")}
      </Button>
    </>
  );
};
