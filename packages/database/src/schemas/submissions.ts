import { z } from 'zod';
// 🛠️ CORRECTED: Importing from the specific domain constants
import { SUBMISSION_STATUSES, SUBMISSION_TYPES } from '../constants/submissions';

/**
 * Validates the payload when an author submits a new manuscript.
 */
export const insertSubmissionSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(255, 'Title is too long'),
  type: z.enum(SUBMISSION_TYPES as [string, ...string[]]),
  content: z.string().nullable().optional(),
  file_url: z.string()
    .url('Must be a valid URL')
    .refine((val) => val.startsWith('https://') || val.startsWith('http://'), {
      message: 'Must be a secure HTTP/HTTPS URL',
    })
    .nullable()
    .optional(),
});

/**
 * Validates the payload when an editor updates a submission's status.
 */
export const updateSubmissionStatusSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES as [string, ...string[]]),
});

/**
 * Validates the payload for editorial rubric grading.
 */
export const gradeSubmissionSchema = z.object({
  rubric_technical: z.number().min(0).max(10),
  rubric_thematic: z.number().min(0).max(10),
  rubric_originality: z.number().min(0).max(10),
  rubric_formatting: z.string().nullable().optional(),
  rubric_archive: z.boolean(),
});
