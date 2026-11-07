"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { callApi } from "@/lib/diwan/api";
import { DiwanSection } from "../page";

/**
 * "Download your data" (decisions §11): everything the site keeps about
 * the person, as one JSON file, from the API route.
 */
export const DownloadData = () => {
  const t = useTranslations("diwan.profile.download");
  const { supabase } = useAuth();
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
      <Button
        className="justify-self-start px-0"
        disabled={download.isPending}
        onClick={() => download.mutate()}
        variant="link"
      >
        {download.isPending ? t("preparing") : t("submit")}
      </Button>
      {download.isError ? (
        <p className="text-text" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </DiwanSection>
  );
};
