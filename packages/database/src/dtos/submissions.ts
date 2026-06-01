// The shape of the data the frontend UI actually wants
/**
 * EditorialTableDTO
 *
 * @description Standardized execution for EditorialTableDTO.
 */
export interface EditorialTableDTO {
  id: string;
  title: string;
  type: string;
  status: string;
  submittedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

/**
 * Translates a joined Supabase submission record into a flat, UI-ready DTO.
 * Accepts `any` for the raw input to bypass strict Supabase Join inference limits,
 * but outputs a mathematically strict frontend object.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for mapping complex Supabase joins
/**
 * toEditorialTableDTO
 *
 * @description Standardized execution for toEditorialTableDTO.
 */
export function toEditorialTableDTO(raw: any): EditorialTableDTO {
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type || 'other',
    status: raw.status || 'pending',
    submittedAt: raw.submitted_at || new Date().toISOString(),
    // Supabase joins return the relation name (users) as the key
    authorName: raw.users?.full_name || 'Unknown Author',
    authorAvatarUrl: raw.users?.avatar_url || null,
  };
}
