import type { Enums } from '../types';

/**
 * SUBMISSION_STATUS_LABELS
 *
 * @description Standardized execution for SUBMISSION_STATUS_LABELS.
 */
export const SUBMISSION_STATUS_LABELS: Record<Enums<'submission_status'>, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  revisions_requested: 'Revisions Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
} as const;

/**
 * SUBMISSION_TYPE_LABELS
 *
 * @description Standardized execution for SUBMISSION_TYPE_LABELS.
 */
export const SUBMISSION_TYPE_LABELS: Record<Enums<'submission_type'>, string> = {
  essay: 'Essay',
  poetry: 'Poetry',
  fiction: 'Fiction',
  theatre: 'Theatre',
  other: 'Other',
} as const;

/**
 * SUBMISSION_STATUSES
 *
 * @description Standardized execution for SUBMISSION_STATUSES.
 */
export const SUBMISSION_STATUSES = Object.keys(SUBMISSION_STATUS_LABELS) as Enums<'submission_status'>[];
/**
 * SUBMISSION_TYPES
 *
 * @description Standardized execution for SUBMISSION_TYPES.
 */
export const SUBMISSION_TYPES = Object.keys(SUBMISSION_TYPE_LABELS) as Enums<'submission_type'>[];
