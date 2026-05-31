import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesInsert, TablesUpdate } from '../types';
import type { Submission } from '../aliases';

/**
 * Inserts a new manuscript submission into the database.
 */
export async function createSubmission(
  client: SupabaseClient<Database>,
  payload: TablesInsert<'submissions'>
): Promise<{ data: Submission | null; error: any }> {
  return await client
    .from('submissions')
    .insert(payload)
    .select()
    .single();
}

/**
 * Updates the editorial status of a specific submission.
 */
export async function updateSubmissionStatus(
  client: SupabaseClient<Database>,
  id: string,
  status: Database['public']['Enums']['submission_status']
): Promise<{ data: Submission | null; error: any }> {
  return await client
    .from('submissions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
}
