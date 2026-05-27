import type { Enums } from './types';

// By tying the keys strictly to Enums<'...'>, TypeScript will throw an error
// if you ever miss a database enum or misspell one.
export const SUBMISSION_STATUS_LABELS: Record<Enums<'submission_status'>, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  revisions_requested: 'Revisions Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
} as const;

export const SUBMISSION_TYPE_LABELS: Record<Enums<'submission_type'>, string> = {
  essay: 'Essay',
  poetry: 'Poetry',
  fiction: 'Fiction',
  theatre: 'Theatre',
  other: 'Other',
} as const;

export const USER_ROLE_LABELS: Record<Enums<'user_role'>, string> = {
  member: 'Member',
  editor: 'Editor',
  admin: 'Administrator',
} as const;

// Helper arrays if you just need the raw values (e.g., for Zod validation)
export const SUBMISSION_STATUSES = Object.keys(
  SUBMISSION_STATUS_LABELS,
) as Enums<'submission_status'>[];
export const SUBMISSION_TYPES = Object.keys(SUBMISSION_TYPE_LABELS) as Enums<'submission_type'>[];
export const USER_ROLES = Object.keys(USER_ROLE_LABELS) as Enums<'user_role'>[];
