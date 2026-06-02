import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Converts a single text query into a mathematical vector embedding.
 * Used when a user types into the search bar.
 * 
 * @param text - The user's search query
 * @returns An array of floating point numbers representing the semantic meaning
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: text,
  });
  
  return embedding;
}

/**
 * Converts an entire manuscript into vector embeddings for database storage.
 * Used during the indexing/publishing phase.
 * 
 * @param chunks - The manuscript text broken into smaller paragraphs
 * @returns An array of embeddings corresponding to each chunk
 */
export async function generateDocumentEmbeddings(chunks: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: google.textEmbeddingModel('text-embedding-004'),
    values: chunks,
  });
  
  return embeddings;
}
