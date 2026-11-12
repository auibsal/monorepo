"use client";

import { Button } from "@repo/brand/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { callApi } from "@/lib/diwan/api";
import { DiwanSection } from "../page";

interface Export {
  account: Record<string, unknown> | null;
  profile: Record<string, unknown>[];
  tables: Record<string, Record<string, unknown>[]>;
}

/** A field's value as text: dates and lists as they are, objects as JSON. */
const text = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

/** One record: its fields as a definition list. */
const Record_ = ({ row }: { row: Record<string, unknown> }) => (
  <dl className="border-line grid gap-x-6 gap-y-1 border-t py-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
    {Object.entries(row).map(([key, value]) => (
      <div className="contents" key={key}>
        <dt className="type-caption" dir="ltr">
          {key.replaceAll("_", " ")}
        </dt>
        <dd className="type-body break-words">{text(value)}</dd>
      </div>
    ))}
  </dl>
);

/**
 * "Download your data" (decisions.md, Members): everything the site keeps
 * about the person, from the API route, as a readable page here or as one
 * JSON file.
 */
export const DownloadData = () => {
  const t = useTranslations("diwan.profile.download");
  const { supabase } = useAuth();
  const [shown, setShown] = useState<Export | null>(null);
  const show = useMutation({
    mutationFn: () => callApi<Export>(supabase, "/account/export", {}),
    onSuccess: setShown,
  });
  const download = useMutation({
    mutationFn: async () => {
      const data = await callApi<object>(supabase, "/account/export", {});
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `auibsal-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
  return (
    <DiwanSection
      description={t("description")}
      id="download-data"
      title={t("title")}
    >
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Button
          className="px-0"
          disabled={show.isPending}
          onClick={() => show.mutate()}
          variant="link"
        >
          {show.isPending ? t("preparing") : t("show")}
        </Button>
        <Button
          className="px-0"
          disabled={download.isPending}
          onClick={() => download.mutate()}
          variant="link"
        >
          {download.isPending ? t("preparing") : t("submit")}
        </Button>
      </div>
      {shown ? (
        <div className="grid gap-6">
          {shown.account ? (
            <section className="grid gap-2">
              <h3 className="type-subheading">{t("account")}</h3>
              <Record_ row={shown.account} />
            </section>
          ) : null}
          {shown.profile.length > 0 ? (
            <section className="grid gap-2">
              <h3 className="type-subheading">{t("profile")}</h3>
              {shown.profile.map((row) => (
                <Record_ key={String(row.id)} row={row} />
              ))}
            </section>
          ) : null}
          {Object.entries(shown.tables).map(([table, rows]) => (
            <section className="grid gap-2" key={table}>
              <h3 className="type-subheading" dir="ltr">
                {table}
              </h3>
              {rows.map((row, index) => (
                <Record_ key={String(row.id ?? index)} row={row} />
              ))}
            </section>
          ))}
        </div>
      ) : null}
      {download.isError || show.isError ? (
        <p className="text-text" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </DiwanSection>
  );
};
