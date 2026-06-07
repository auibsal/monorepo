import { qstashClient } from './client';
import { env } from '@auibsal/env';

export interface PublishJournalPayload {
  issueId: string;
  volumeNumber: number;
  issueNumber: number;
}

/**
 * Pushes a journal publication event to the queue.
 * QStash will capture this and reliably ping the internal worker endpoint.
 */
export const dispatchJournalPublication = async (payload: PublishJournalPayload) => {
  return await qstashClient.publishJSON({
    // Vercel apps typically expose a dedicated API route for background workers
    url: `${env.NEXT_PUBLIC_APP_URL}/api/workers/journal-publisher`,
    body: payload,
    // Add a 5-second delay so the database has time to settle before processing
    delay: 5, 
    retries: 3,
  });
};

// Export the raw client and types for advanced usage
export { qstashClient };
