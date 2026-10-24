"use client";

import { useSearchParams } from "next/navigation";

/**
 * Record ids travel in the query string (?id=…): each route is one
 * prerendered page.
 */
export const useQueryParam = (name: string) =>
  useSearchParams().get(name) ?? null;
