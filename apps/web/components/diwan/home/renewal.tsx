"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { DiwanSection } from "../page";

const KEY = ["renewal-due"];

/**
 * Each September (decisions.md, Members): "I'm still here", one click, with
 * the Code of Conduct acknowledged again. A member who doesn't stays a
 * member but leaves the active count until they do.
 */
export const Renewal = () => {
  const t = useTranslations("diwan.home.renewal");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const due = useQuery({
    queryFn: async () =>
      Boolean(unwrap(await supabase.schema("membership").rpc("renewal_due"))),
    queryKey: KEY,
  });
  const renew = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.schema("membership").rpc("renew_membership")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  if (renew.isSuccess) {
    return (
      <p className="type-body border-line border-t pt-4" role="status">
        {t("done")}
      </p>
    );
  }
  if (!due.data) {
    return null;
  }
  return (
    <DiwanSection description={t("lede")} id="renewal" title={t("title")}>
      <p className="type-body">
        {t("conduct")}{" "}
        <Link className="link" href="/code-of-conduct">
          {t("readConduct")}
        </Link>
      </p>
      <Button
        className="justify-self-start"
        disabled={renew.isPending}
        onClick={() => renew.mutate()}
      >
        {t("action")}
      </Button>
      {renew.isError ? (
        <p className="type-body font-medium" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </DiwanSection>
  );
};
