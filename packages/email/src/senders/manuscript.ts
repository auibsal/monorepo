import { resend, SENDER_IDENTITY } from '../client';
import { ManuscriptDecisionTemplate } from '../templates/ManuscriptDecision';

/**
 * Parameters for dispatching a manuscript decision email.
 */
export interface SendManuscriptDecisionParams {
  to: string;
  authorName: string;
  manuscriptTitle: string;
  status: 'accepted' | 'rejected' | 'revisions_requested';
}

/**
 * Dispatches an email notification regarding a manuscript's editorial decision.
 *
 * @param {SendManuscriptDecisionParams} params - The data required to populate the decision template.
 * @returns {Promise<{success: boolean, error?: any, data?: any}>} The result of the email dispatch operation.
 * @example
 * const result = await sendManuscriptDecision({
 *   to: 'author@auib.edu.iq',
 *   authorName: 'John Doe',
 *   manuscriptTitle: 'The Genesis of Letters',
 *   status: 'accepted'
 * });
 */
export async function sendManuscriptDecision(params: SendManuscriptDecisionParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: SENDER_IDENTITY,
      to: [params.to],
      subject: `[AUIB SAL] Manuscript Update: ${params.manuscriptTitle}`,
      react: ManuscriptDecisionTemplate({
        authorName: params.authorName,
        manuscriptTitle: params.manuscriptTitle,
        status: params.status,
      }) as any,
    });

    if (error) {
      throw new Error(`Resend Engine Failure: ${error.message}`);
    }

    return { success: true, data };
  } catch (err) {
    console.error('Failed to transmit manuscript decision:', err);
    return { success: false, error: err };
  }
}
