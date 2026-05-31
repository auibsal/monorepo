import type { Enums } from '../types';

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

export const SUBMISSION_STATUSES = Object.keys(SUBMISSION_STATUS_LABELS) as Enums<'submission_status'>[];
export const SUBMISSION_TYPES = Object.keys(SUBMISSION_TYPE_LABELS) as Enums<'submission_type'>[];
