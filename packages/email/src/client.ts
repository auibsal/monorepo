import { Resend } from 'resend';
import { env } from '@auibsal/env';

// The consumer application (Nexus/Web) is strictly responsible for providing this environment variable.
const apiKey = env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('RESEND_API_KEY is not defined in the environment. Email transmission will fail.');
}

/**
 * resend
 *
 * @description Standardized execution for resend.
 */
export const resend = new Resend(apiKey);

// Define the official domain sender identity for the Society
/**
 * SENDER_IDENTITY
 *
 * @description Standardized execution for SENDER_IDENTITY.
 */
export const SENDER_IDENTITY = 'AUIB Society of Arts and Letters <team@auibsal.org>';
