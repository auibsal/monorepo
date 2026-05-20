// Define the arrays "as const" so they lock in as strict literal types
export const SUBMISSION_STATUSES = [
  'pending',
  'under_review',
  'revisions_requested',
  'accepted',
  'rejected',
] as const;

export const SUBMISSION_TYPES = [
  'essay',
  'poetry',
  'fiction',
  'theatre',
  'visual_art',
  'other',
] as const;

export const USER_ROLES = [
  'member',
  'editor',
  'admin',
] as const;
