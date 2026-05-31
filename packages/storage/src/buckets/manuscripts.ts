import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKETS } from '../constants';

/**
 * Uploads a private manuscript PDF to the vault.
 * Forces a mathematical path structure: {userId}/{submissionId}.pdf
 */
export async function uploadManuscript(
  client: SupabaseClient,
  userId: string,
  submissionId: string,
  fileBody: File | Blob | Buffer
): Promise<{ path: string | null; error: any }> {
  const path = `${userId}/${submissionId}.pdf`;

  const { data, error } = await client.storage
    .from(BUCKETS.MANUSCRIPTS)
    .upload(path, fileBody, {
      upsert: true,
      contentType: 'application/pdf',
    });

  if (error) return { path: null, error };
  return { path: data.path, error: null };
}

/**
 * Generates a cryptographic, time-limited URL for editors to read manuscripts.
 * Defaults to 1 hour (3600 seconds) to prevent permanent link sharing.
 */
export async function getManuscriptSignedUrl(
  client: SupabaseClient,
  path: string,
  expiresInSeconds = 3600
): Promise<{ signedUrl: string | null; error: any }> {
  const { data, error } = await client.storage
    .from(BUCKETS.MANUSCRIPTS)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return { signedUrl: null, error };
  return { signedUrl: data.signedUrl, error: null };
}

/**
 * Irreversibly deletes a manuscript from the vault.
 */
export async function deleteManuscript(
  client: SupabaseClient,
  path: string
): Promise<{ error: any }> {
  const { error } = await client.storage
    .from(BUCKETS.MANUSCRIPTS)
    .remove([path]);

  return { error };
}
