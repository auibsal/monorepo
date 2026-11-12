"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
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

/** The steps a person ticks; the site marks the rest itself. */
const TICKED = new Set<StepKey>(["pages", "handover", "mailbox", "notion"]);

/** Where each step is done, when it is done on the site. */
const WHERE: Partial<Record<StepKey, string>> = {
  declaration: "/account/settings/disclosures/declare",
  diwan_group: "/account/settings",
  pages: "/library",
  two_step: "/account/settings",
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
      unwrap(await supabase.schema("core").rpc("my_register_name")) ?? "",
    queryKey: ["core", "register-name"],
  });
  const sign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("access")
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
      (unwrap(await supabase.schema("access").rpc("my_role_checklist")) ??
        []) as Step[],
    queryKey: key,
  });
  const tick = useMutation({
    mutationFn: async ({ id, step }: { id: string; step: string }) =>
      unwrap(
        await supabase
          .schema("access")
          .rpc("tick_role_step", { assignment_id: id, step })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const byRole = new Map<string, Step[]>();
  for (const step of steps.data ?? []) {
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
        return (
          <Section
            description={t("lede")}
            id={`role-${first.assignment_id}`}
            key={first.assignment_id}
            title={t("title", { role })}
          >
            <RowList>
              {list.map((s) => {
                const where = WHERE[s.step];
                return (
                  <li
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
                    key={s.step}
                  >
                    <span className={s.done ? "text-text-secondary" : ""}>
                      {`${s.done ? t("done") : t("todo")} ${t(`steps.${s.step}`)}`}
                    </span>
                    {!s.done && where ? (
                      <Link className="link text-sm" href={where}>
                        {t("go")}
                      </Link>
                    ) : null}
                    {!s.done && s.step === "pledge" ? (
                      <RoleAgreement
                        assignmentId={s.assignment_id}
                        onSigned={() =>
                          queryClient.invalidateQueries({ queryKey: key })
                        }
                      />
                    ) : null}
                    {!s.done && TICKED.has(s.step) ? (
                      <Button
                        disabled={tick.isPending}
                        onClick={() =>
                          tick.mutate({ id: s.assignment_id, step: s.step })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        {t("tick")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </RowList>
          </Section>
        );
      })}
    </>
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
        await supabase.schema("access").rpc("my_unsigned_role_agreements")
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
