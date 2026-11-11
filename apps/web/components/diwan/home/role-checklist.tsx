"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { RowList } from "../page";
import { Section } from "./section";

/** The steps a person ticks; the site marks the rest itself. */
const TICKED = new Set(["pages", "handover", "mailbox", "notion"]);

/** Where each step is done, when it is done on the site. */
const WHERE: Record<string, string | undefined> = {
  declaration: "/forms/F-06",
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
  step: string;
}

/**
 * F-04, the new role holder's checklist (decisions.md, Forms): from the day a
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
