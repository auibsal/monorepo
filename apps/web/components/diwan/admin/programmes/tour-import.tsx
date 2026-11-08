"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { formatNumber } from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { Link } from "@/lib/diwan/navigation";
import { ErrorLine } from "../kit";

const waitingKey = ["admin", "programmes", "invitations-waiting"];

interface Waiting {
  joined: number;
  pages: number;
  sent: number;
  unclaimed: number;
  waiting: number;
}

/** A writer typed two pages when their words hold " / " (the list's way). */
const pagesOf = (words: string, emailRows: number) =>
  Math.max(words.includes(" / ") ? 2 : 1, emailRows);

/**
 * The spring 2026 Tour, once (decisions §1 and §2): the scanned pages
 * (diwan_six_words_import.csv) and the invitation list
 * (invitation_list.csv) go from this browser straight to the database
 * (`programmes.import_tour`); neither file is kept anywhere else. The
 * invitations go from Membership → Invitations, list by list.
 */
export const TourImport = () => {
  const t = useTranslations("diwan.admin.programmes.sixWords.import");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const pagesId = useId();
  const listId = useId();
  const [pages, setPages] = useState<Record<string, string>[] | null>(null);
  const [list, setList] = useState<Record<string, string>[] | null>(null);

  const waiting = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .rpc("invitations_waiting", { list: "tour_2026" })
      ) as Waiting | null,
    queryKey: waitingKey,
  });

  const read = async (file: File | undefined) =>
    file ? parseCsv(await file.text()) : null;

  const load = useMutation({
    mutationFn: async () => {
      const byEmail = new Map<string, number>();
      for (const page of pages ?? []) {
        const email = page.email?.trim().toLowerCase();
        if (email) {
          byEmail.set(email, (byEmail.get(email) ?? 0) + 1);
        }
      }
      const invitations = (list ?? []).map((row) => ({
        ...row,
        pages: pagesOf(
          row.their_words ?? "",
          byEmail.get(row.email?.trim().toLowerCase() ?? "") ?? 0
        ),
      }));
      return unwrap(
        await supabase.schema("programmes").rpc("import_tour", {
          invitations,
          pages: pages ?? [],
        })
      ) as { attached: number; invitations: number; pages: number };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: waitingKey });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "programmes", "six-words"],
      });
    },
  });

  const counts = waiting.data;

  return (
    <section className="grid max-w-3xl gap-4">
      <h3 className="type-subheading">{t("title")}</h3>
      <p className="type-body text-text-secondary">{t("lede")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2" htmlFor={pagesId}>
          <span className="type-label">{t("pages")}</span>
          <input
            accept=".csv,text/csv"
            className="type-body"
            id={pagesId}
            onChange={async (event) =>
              setPages(await read(event.target.files?.[0]))
            }
            type="file"
          />
          {pages ? (
            <span className="type-caption">
              {t("rows", { count: formatNumber(pages.length) })}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2" htmlFor={listId}>
          <span className="type-label">{t("list")}</span>
          <input
            accept=".csv,text/csv"
            className="type-body"
            id={listId}
            onChange={async (event) =>
              setList(await read(event.target.files?.[0]))
            }
            type="file"
          />
          {list ? (
            <span className="type-caption">
              {t("rows", { count: formatNumber(list.length) })}
            </span>
          ) : null}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!(pages || list) || load.isPending}
          onClick={() => load.mutate()}
          variant="outline"
        >
          {t("load")}
        </Button>
        {load.data ? (
          <p className="type-caption" role="status">
            {t("loaded", {
              attached: formatNumber(load.data.attached),
              invitations: formatNumber(load.data.invitations),
              pages: formatNumber(load.data.pages),
            })}
          </p>
        ) : null}
      </div>
      <ErrorLine error={load.error} />

      {counts ? (
        <div className="border-line grid gap-3 border-t pt-4">
          <p className="type-body">
            {t("status", {
              joined: formatNumber(counts.joined),
              sent: formatNumber(counts.sent),
              unclaimed: formatNumber(counts.unclaimed),
              waiting: formatNumber(counts.waiting),
            })}
          </p>
          <p className="type-caption text-text-secondary">
            <Link className="link" href="/membership/invitations">
              {t("invitations")}
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
};
