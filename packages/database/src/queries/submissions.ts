import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import type { Submission } from '../index';
import { toEditorialTableDTO, type EditorialTableDTO } from '../dtos/submissions';

/**
 * Retrieves a single submission by its UUID.
 */
export async function getSubmissionById(
  client: SupabaseClient<Database>,
  id: string
): Promise<{ data: Submission | null; error: any }> {
  return await client.from('submissions').select('*').eq('id', id).single();
}

/**
 * Retrieves all submissions joined with author data, mapped perfectly for the Editorial Dashboard.
 */
export async function getEditorialDashboardSubmissions(
  client: SupabaseClient<Database>
): Promise<{ data: EditorialTableDTO[] | null; error: any }> {
  const { data, error } = await client
    .from('submissions')
    // The query string tells Supabase to execute an inner join on the users table
    .select(`
      *,
      users (
        full_name,
        avatar_url
      )
    `)
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false });

  if (error || !data) {
    return { data: null, error };
  }

  // Pass the raw joined data through the DTO translator
  const formattedData = data.map(toEditorialTableDTO);

  return { data: formattedData, error: null };
}
