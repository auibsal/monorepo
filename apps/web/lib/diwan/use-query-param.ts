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
