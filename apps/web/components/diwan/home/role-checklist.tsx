"use client";

import { Button } from "@repo/brand/components/ui/button";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { MySignature } from "@/components/signature";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { RowList } from "../page";
import { Section } from "./section";

type StepKey =
  | "declaration"
  | "diwan_group"
  | "email"
  | "handover"
  | "mailbox"
  | "notion"
  | "pages"
  | "pledge"
  | "two_step";

/** Where each step is done, when it is done on the site. */
const WHERE: Partial<Record<StepKey, string>> = {
  declaration: "/account/settings/disclosures/declare",
  diwan_group: "/account/settings",
  handover: "/account/roles",
  pages: "/library",
  two_step: "/account/settings",
};

/**
 * Steps the site can't see done (decisions.md, Where things live: To-dos):
 * each is a link that counts as done once opened, never "Mark as done".
 * Opening the library, the handover, the seat's mailbox or Notion is the
 * step.
 */
const DONE_ON_OPEN: Partial<Record<StepKey, string>> = {
  handover: "/account/roles",
  mailbox: "https://mail.zoho.com",
  notion: "https://www.notion.so",
  pages: "/library",
};

interface Step {
  assignment_id: string;
  done: boolean;
  role_ar: string;
  role_en: string;
  seat: boolean;
  starts_at: string;
  step: StepKey;
}

/**
 * The role agreement (decisions.md, Documents and forms): the Code of
 * Conduct and the license for work made in the role, signed in the name
 * the register holds, before the declaration.
 */
const RoleAgreement = ({
  assignmentId,
  onSigned,
}: {
  assignmentId: string;
  onSigned: () => void;
}) => {
  const t = useTranslations("diwan.home.roleChecklist.agreement");
  const { supabase } = useAuth();
  const name = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("api").rpc("my_register_name")) ?? "",
    queryKey: ["core", "register-name"],
  });
  const sign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .rpc("sign_role_agreement", { assignment_id: assignmentId })
      ),
    onSuccess: onSigned,
  });
  return (
    <div className="border-line grid basis-full gap-2 border-s ps-4">
      <p className="type-body max-w-[60ch]">{t("conduct")}</p>
      <Link className="link justify-self-start text-sm" href="/code-of-conduct">
        {t("readConduct")}
      </Link>
      <p className="type-body max-w-[60ch]">{t("license")}</p>
      <MySignature label={t("signAsLabel")} />
      <Button
        className="justify-self-start"
        disabled={sign.isPending || !name.data}
        onClick={() => sign.mutate()}
        size="sm"
        variant="outline"
      >
        {t("sign", { name: name.data ?? "" })}
      </Button>
      {sign.error ? (
        <p className="type-caption text-accent" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

/**
 * role-holder-checklist, the new role holder's checklist (decisions.md, Forms): from the day a
 * role is given, its steps in order. The site marks what it can see (the
 * declaration, two-step sign-in, the Diwan group) and the holder ticks the
 * rest. It shows until every step is done.
 */
export const RoleChecklist = () => {
  const t = useTranslations("diwan.home.roleChecklist");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["home", "role-checklist", user?.id];
  const steps = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.schema("api").rpc("my_role_checklist")) ??
        []) as Step[],
    queryKey: key,
  });
  // A role whose agreement is its own to-do (UnsignedRoleAgreements) leaves
  // the signing step out here, so it never shows twice (core.my_todos).
  const unsigned = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      new Set(
        (
          (unwrap(
            await supabase.schema("api").rpc("my_unsigned_role_agreements")
          ) ?? []) as Unsigned[]
        ).map((r) => r.assignment_id)
      ),
    queryKey: ["home", "unsigned-role-agreements", "ids", user?.id],
  });
  const byRole = new Map<string, Step[]>();
  for (const step of (steps.data ?? []).filter(
    (s) => !(s.step === "pledge" && unsigned.data?.has(s.assignment_id))
  )) {
    byRole.set(step.assignment_id, [
      ...(byRole.get(step.assignment_id) ?? []),
      step,
    ]);
  }
  const open = [...byRole.values()].filter((list) => list.some((s) => !s.done));
  if (open.length === 0) {
    return null;
  }
  return (
    <>
      {open.map((list) => {
        const first = list[0] as Step;
        const role = localized(
          { role_ar: first.role_ar, role_en: first.role_en },
          "role",
          locale
        );
        const done = list.filter((s) => s.done).length;
        // Today lists only what's left; the count says how far along.
        const left = list.filter((s) => !s.done);
        return (
          <Section
            description={t("progress", {
              done: formatNumber(done),
              total: formatNumber(list.length),
            })}
            id={`role-${first.assignment_id}`}
            key={first.assignment_id}
            title={t("title", { role })}
          >
            <RowList>
              {left.map((s) => (
                <li
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
                  key={s.step}
                >
                  <StepAction
                    assignmentId={s.assignment_id}
                    onDone={() =>
                      queryClient.invalidateQueries({ queryKey: key })
                    }
                    step={s.step}
                  />
                </li>
              ))}
            </RowList>
          </Section>
        );
      })}
    </>
  );
};

/**
 * One step's one action, named for what it does: a link where the step is
 * done on the site, a link that counts once opened where the site can't
 * see it, the role agreement to sign, or (for what only others do, such as
 * the role email) a line that clears by itself.
 */
const StepAction = ({
  assignmentId,
  onDone,
  step,
}: {
  assignmentId: string;
  onDone: () => void;
  step: StepKey;
}) => {
  const t = useTranslations("diwan.home.roleChecklist");
  const { supabase } = useAuth();
  const tick = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .rpc("tick_role_step", { assignment_id: assignmentId, step })
      ),
    onSuccess: onDone,
  });
  const label = t(`actions.${step}`);
  if (step === "pledge") {
    return (
      <div className="grid basis-full gap-2">
        <span>{label}</span>
        <RoleAgreement assignmentId={assignmentId} onSigned={onDone} />
      </div>
    );
  }
  const opens = DONE_ON_OPEN[step];
  if (opens) {
    const external = opens.startsWith("https://");
    return external ? (
      <a
        className="link"
        href={opens}
        onClick={() => tick.mutate()}
        rel="noopener"
        target="_blank"
      >
        {label}
      </a>
    ) : (
      <Link className="link" href={opens} onClick={() => tick.mutate()}>
        {label}
      </Link>
    );
  }
  const where = WHERE[step];
  return where ? (
    <Link className="link" href={where}>
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  );
};

interface Unsigned {
  assignment_id: string;
  role_ar: string;
  role_en: string;
}

/**
 * The role agreement for roles held from before it existed (decisions.md,
 * Documents and forms): asked on Today at the next sign-in, one per role,
 * until it is signed. Roles newer than the checklist's window ask in the
 * checklist above instead.
 */
export const UnsignedRoleAgreements = () => {
  const t = useTranslations("diwan.home.roleChecklist");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["home", "unsigned-role-agreements", user?.id];
  const roles = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase.schema("api").rpc("my_unsigned_role_agreements")
      ) ?? []) as Unsigned[],
    queryKey: key,
  });
  if (!roles.data?.length) {
    return null;
  }
  return (
    <>
      {roles.data.map((r) => (
        <Section
          id={`agreement-${r.assignment_id}`}
          key={r.assignment_id}
          title={t("signAgreement", {
            role: localized(
              { role_ar: r.role_ar, role_en: r.role_en },
              "role",
              locale
            ),
          })}
        >
          <RoleAgreement
            assignmentId={r.assignment_id}
            onSigned={() => queryClient.invalidateQueries({ queryKey: key })}
          />
        </Section>
      ))}
    </>
  );
};
