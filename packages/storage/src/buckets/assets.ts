import type { SupabaseClient } from '@supabase/supabase-js';
import { BUCKETS } from '../constants';

type AssetFolder = 'avatars' | 'events' | 'blogs';

/**
 * Uploads a public image and immediately returns the permanent URL.
 */
export async function uploadPublicAsset(
  client: SupabaseClient,
  folder: AssetFolder,
  fileName: string,
  fileBody: File | Blob | Buffer,
  contentType = 'image/jpeg'
): Promise<{ publicUrl: string | null; error: any }> {
  // Generate a clean, structured path
  const path = `${folder}/${fileName}`;

  const { error } = await client.storage
    .from(BUCKETS.ASSETS)
    .upload(path, fileBody, {
      upsert: true,
      contentType,
    });

  if (error) return { publicUrl: null, error };

  // Retrieve the permanent string URL to save to your database
  const { data: publicUrlData } = client.storage
    .from(BUCKETS.ASSETS)
    .getPublicUrl(path);

  return { publicUrl: publicUrlData.publicUrl, error: null };
}

/**
 * Irreversibly deletes a public asset from the edge CDN.
 */
export async function deletePublicAsset(
  client: SupabaseClient,
  folder: AssetFolder,
  fileName: string
): Promise<{ error: any }> {
  const path = `${folder}/${fileName}`;
  
  const { error } = await client.storage
    .from(BUCKETS.ASSETS)
    .remove([path]);

  return { error };
}
