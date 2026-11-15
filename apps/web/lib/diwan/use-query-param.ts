"use client";

import { useSearchParams } from "next/navigation";
import { createContext, useContext } from "react";

/**
 * Values a page's own address carries (the overhaul, Oct 30, 2026: every
 * Diwan item and member record has a path, /diwan/events/<slug>), provided
 * by the page around its content (`RouteParamsProvider`).
 */
export const RouteParams = createContext<Readonly<Record<string, string>>>({});

/**
 * A record's id or a view's setting: from the page's address first
 * (RouteParams), then from the query string.
 */
export const useQueryParam = (name: string) => {
  const fromPath = useContext(RouteParams)[name];
  const fromQuery = useSearchParams().get(name);
  return fromPath ?? fromQuery ?? null;
};

/**
 * A list's find line or filter, kept in the query string (decisions.md,
 * The site: "Lasting addresses"), so a filtered list can be shared and
 * comes back on reload. Setting an empty value removes it.
 */
export const useQueryState = (name: string) => {
  const params = useSearchParams();
  const value = params.get(name) ?? "";
  const set = (next: string) => {
    const query = new URLSearchParams(params.toString());
    if (next) {
      query.set(name, next);
    } else {
      query.delete(name);
    }
    const search = query.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`
    );
  };
  return [value, set] as const;
};
