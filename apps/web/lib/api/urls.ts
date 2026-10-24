import { apiUrl, nexusUrl, siteUrl } from "@repo/internationalization";
import { env } from "@/env";

const TRAILING_SLASH = /\/$/;

/** This deployment's origin (production, a preview or localhost). */
export const origin = () =>
  env.NEXT_PUBLIC_SITE_URL.replace(TRAILING_SLASH, "");

/** A public page on this deployment, in a language. */
export const site = (lang: string, path = "/") => siteUrl(lang, path, origin());

/** A Nexus page on this deployment, in a language. */
export const nexus = (lang: string, path = "/") =>
  nexusUrl(lang, path, origin());

/** An API route on this deployment. */
export const api = (path: string) => apiUrl(path, origin());
