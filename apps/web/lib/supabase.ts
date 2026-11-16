import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import type { Database } from "@repo/database";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/env";
import { setClock } from "@/lib/data";
import { roughlyNow } from "@/lib/this-year";

/** The moment a published read runs at (see `readPublished`). */
const readingAt = new AsyncLocalStorage<number>();
setClock(() => readingAt.getStore() ?? Date.now());

/** Cache tags revalidated on publish (the API routes → /api/revalidate). */
export const cacheTags = [
  "events",
  "journal",
  "news",
  "programs",
  "documents",
  "about",
  "partners",
  "certificates",
  "productions",
  "governance",
] as const;
export type CacheTag = (typeof cacheTags)[number];

interface CachedResponse {
  body: string;
  headers: [string, string][];
  status: number;
  statusText: string;
}

/** Headers a rebuilt response must not carry (the body is already plain). */
const DROPPED = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

/**
 * One published read's HTTP answer, kept by its address, headers and body
 * (Cache Components: a `fetch` outside `use cache` is uncached data, and an
 * error answer is never stored, so one failed read used to stop a page's
 * prerender and the build). An answer is kept an hour and refreshed on
 * publish by its tags; an error, or no answer at all, only a minute, so
 * the page shows the section empty (readPublished) and recovers on its own.
 */
const cachedRead = async (
  url: string,
  method: string,
  headers: [string, string][],
  body: string | null,
  tags: CacheTag[]
): Promise<CachedResponse> => {
  "use cache";
  cacheTag(...tags);
  try {
    const response = await fetch(url, { body, headers, method });
    const text = await response.text();
    if (response.ok) {
      cacheLife("hours");
    } else {
      cacheLife("minutes");
    }
    return {
      body: text,
      headers: [...response.headers].filter(([name]) => !DROPPED.has(name)),
      status: response.status,
      statusText: response.statusText,
    };
  } catch {
    cacheLife("minutes");
    return {
      body: JSON.stringify({ message: "The database did not answer." }),
      headers: [["content-type", "application/json"]],
      status: 503,
      statusText: "Service Unavailable",
    };
  }
};

/** The published client's fetch: every request through `cachedRead`. */
const cachedFetch =
  (tags: CacheTag[]): typeof fetch =>
  async (input, init) => {
    const request = new Request(input, init);
    const body = request.body ? await request.text() : null;
    const headers = [...request.headers].sort(([a], [b]) => a.localeCompare(b));
    const answer = await cachedRead(
      request.url,
      request.method,
      headers,
      body,
      [...tags].sort()
    );
    return new Response(answer.status === 204 ? null : answer.body, {
      headers: answer.headers,
      status: answer.status,
      statusText: answer.statusText,
    });
  };

/**
 * Anonymous Supabase client for published reads. The publishable key and
 * RLS mean it can only see public rows; responses are cached by tag and
 * refreshed when content is published.
 */
const publicClient = (...tags: CacheTag[]): SupabaseClient<Database> | null => {
  if (
    !(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ) {
    return null;
  }
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: cachedFetch(tags) },
    }
  );
};

/**
 * Runs a published-data read; a missing configuration or an outage renders
 * the section empty instead of failing the page.
 */
export const readPublished = async <T>(
  tags: CacheTag[],
  read: (client: SupabaseClient<Database>) => Promise<T>,
  fallback: T
): Promise<T> => {
  const client = publicClient(...tags);
  if (!client) {
    return fallback;
  }
  try {
    // The shared reads compare against a moment kept a few minutes, so the
    // page can be prerendered and refreshes on its own.
    const at = await roughlyNow();
    return await readingAt.run(at, () => read(client));
  } catch {
    return fallback;
  }
};

/**
 * A read that must be current (a card's status): the same anonymous client
 * as published reads, never cached.
 */
export const readLive = async <T>(
  read: (client: SupabaseClient<Database>) => Promise<T>,
  fallback: T
): Promise<T> => {
  if (
    !(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  ) {
    return fallback;
  }
  const client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
  try {
    return await read(client);
  } catch {
    return fallback;
  }
};
