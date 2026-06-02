import { MeiliSearch } from 'meilisearch';
import type { SearchDocument } from './types';

const INDEX_NAME = 'society_records';

/**
 * Pushes new or updated records into the search index.
 * This must only be executed in a secure server environment using the Admin API Key.
 * * @param host - The URL of the search server.
 * @param adminKey - The private administrative API key.
 * @param documents - An array of mathematically formatted search documents.
 * * @example
 * ```ts
 * await indexDocuments(env.SEARCH_URL, env.SEARCH_ADMIN_KEY, [newManuscript]);
 * ```
 */
export async function indexDocuments(host: string, adminKey: string, documents: SearchDocument[]) {
  const client = new MeiliSearch({ host, apiKey: adminKey });
  const index = client.index(INDEX_NAME);
  
  // Enforces typo-tolerance and search prioritization rules
  await index.updateSettings({
    searchableAttributes: ['title', 'author', 'content'],
    filterableAttributes: ['type', 'locale'],
    sortableAttributes: ['publishedAt'],
  });

  return await index.addDocuments(documents);
}

/**
 * Removes a record from the search index to prevent dead links.
 * * @param host - The URL of the search server.
 * @param adminKey - The private administrative API key.
 * @param documentId - The unique identifier of the record to delete.
 */
export async function deleteDocument(host: string, adminKey: string, documentId: string) {
  const client = new MeiliSearch({ host, apiKey: adminKey });
  return await client.index(INDEX_NAME).deleteDocument(documentId);
}
