"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useNotionHandbook } from "@/lib/nexus/notion";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { DiwanPage } from "../page";
import { EmptyLine, SectionSpinner } from "../states";

/**
 * The officer handbook lives in the team's Notion workspace (setting
 * `notion.handbook`). This page stays for old links (the Account menu used
 * to open it, docs.auibsal.org redirects here): /handbook?page=events goes
 * straight to that page in Notion.
 */
export const Handbook = () => {
  const t = useTranslations("nexus.handbook");
  const tc = useTranslations("common");
  const slug = useQueryParam("page");
  const handbook = useNotionHandbook();
  const target = handbook.reader ? handbook.pageFor(slug) : null;

  useEffect(() => {
    if (target) {
      window.location.replace(target);
    }
  }, [target]);

  if (handbook.isPending) {
    return <SectionSpinner />;
  }
  if (!handbook.reader) {
    return (
      <DiwanPage narrow title={t("title")}>
        <EmptyLine action={{ href: "/society", label: t("seeSociety") }}>
          {t("forOfficers")}
        </EmptyLine>
      </DiwanPage>
    );
  }

  return (
    <DiwanPage lede={t("inNotion")} narrow title={t("title")}>
      {target ? (
        <Button asChild className="justify-self-start">
          <a href={target} rel="noopener">
            {t("open")}
            <ExternalLink aria-label={tc("externalLink")} className="size-4" />
          </a>
        </Button>
      ) : (
        <EmptyLine action={{ href: "/", label: t("home") }}>
          {t("notConnected")}
        </EmptyLine>
      )}
    </DiwanPage>
  );
};
