import { Resend } from 'resend';

// The consumer application (Nexus/Web) is strictly responsible for providing this environment variable.
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('RESEND_API_KEY is not defined in the environment. Email transmission will fail.');
}

export const resend = new Resend(apiKey);

// Define the official domain sender identity for the Society
export const SENDER_IDENTITY = 'AUIB Society of Arts and Letters <team@auibsal.org>';
