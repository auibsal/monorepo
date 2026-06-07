import { Meilisearch } from 'meilisearch';
import type { SearchDocument } from './types';

/**
 * Initializes and returns a read-only search client for the frontend.
 * * @param host - The URL of the search server.
 * @param apiKey - The public search-only API key.
 * @returns A strictly typed Meilisearch client instance.
 * * @example
 * ```ts
 * import { env } from '@auibsal/env';
 * const searchClient = getSearchClient(env.NEXT_PUBLIC_SEARCH_URL, env.NEXT_PUBLIC_SEARCH_KEY);
 * const results = await searchClient.index('society_records').search('Brutalism');
 * ```
 */
export function getSearchClient(host: string, apiKey: string) {
  if (!host || !apiKey) {
    throw new Error('Search environment variables are missing.');
  }

  return new Meilisearch({
    host,
    apiKey,
  });
}

export type { SearchResponse } from 'meilisearch';
