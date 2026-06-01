import { resend, SENDER_IDENTITY } from '../client';
import { ManuscriptDecisionTemplate } from '../templates/ManuscriptDecision';

/**
 * SendManuscriptDecisionParams
 *
 * @description Standardized execution for SendManuscriptDecisionParams.
 */
export interface SendManuscriptDecisionParams {
  to: string;
  authorName: string;
  manuscriptTitle: string;
  status: 'accepted' | 'rejected' | 'revisions_requested';
}

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
      }),
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
