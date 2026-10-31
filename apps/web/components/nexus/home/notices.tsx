"use client";

import { useAuth } from "@repo/auth/provider";
import { Link } from "@repo/internationalization/navigation";
import { unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMySubmissions } from "@/lib/nexus/queries";
import { RowList } from "../page";
import { Section } from "./section";

interface Need {
  readonly href: string;
  readonly key: string;
  readonly line: string;
}

/**
 * Needs you (the overhaul, Oct 30, 2026): only what this member has to do,
 * each with the way to do it. Notices to everyone go out through Hudhud and
 * the Sunday Paper. The section shows only when there is something.
 */
export const Notices = () => {
  const t = useTranslations("nexus.home.needs");
  const { supabase, user } = useAuth();
  const submissions = useMySubmissions();
  const accepted = (submissions.data ?? [])
    .filter((s) => s.status === "accepted")
    .map((s) => s.id);
  const signed = useQuery({
    enabled: accepted.length > 0,
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .schema("journal")
            .from("agreements")
            .select("submission_id")
            .in("submission_id", accepted)
        ) ?? []
      ).map((row) => row.submission_id),
    queryKey: ["needs", "agreements", accepted],
  });
  const offers = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("opening_replies")
          .select("opening_id, openings(title_en, title_ar)")
          .eq("user_id", user?.id ?? "")
          .eq("status", "offered")
      ) ?? [],
    queryKey: ["needs", "offers", user?.id],
  });

  const needs: Need[] = [
    ...(submissions.data ?? [])
      .filter((s) => s.status === "intake_check" && s.intake_returned_at)
      .map((s) => ({
        href: `/membership/work/submissions/${s.id}`,
        key: `returned-${s.id}`,
        line: t("returned", { title: s.title }),
      })),
    ...(submissions.data ?? [])
      .filter(
        (s) =>
          s.status === "accepted" && signed.data && !signed.data.includes(s.id)
      )
      .map((s) => ({
        href: `/membership/work/submissions/${s.id}`,
        key: `agreement-${s.id}`,
        line: t("agreement", { title: s.title }),
      })),
    ...(offers.data ?? []).map((offer) => ({
      href: "/get-involved",
      key: `offer-${offer.opening_id}`,
      line: t("offer"),
    })),
  ];

  if (needs.length === 0) {
    return null;
  }
  return (
    <Section id="needs-you" title={t("title")}>
      <RowList>
        {needs.map((need) => (
          <li key={need.key}>
            <Link className="link" href={need.href}>
              {need.line}
            </Link>
          </li>
        ))}
      </RowList>
    </Section>
  );
};
