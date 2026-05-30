import type { UniversalCheckoutRequest } from '../../types';
import { waylRequest } from './client';
import type { WaylLinkCreationPayload, WaylLinkRecord, WaylLinkStatus } from './types';

/**
 * Validates authentication credentials directly against Wayl's validation sequence.
 */
export async function verifyAuthKey(): Promise<boolean> {
  const result = await waylRequest<Record<string, never>>('/api/v1/verify-auth-key', {
    method: 'GET',
  });
  return result.success;
}

/**
 * Translates a Universal Checkout Request into Wayl's strictly typed schema,
 * then executes the creation sequence.
 */
export async function createPaymentLink(req: UniversalCheckoutRequest) {
  if (req.amountIQD < 1000) {
    return { success: false as const, error: 'Minimum transaction boundary is 1,000 IQD.' };
  }

  // 1. Translate Universal -> Wayl Payload
  const body: WaylLinkCreationPayload = {
    env: process.env.WAYL_ENV === 'live' ? 'live' : 'test',
    referenceId: req.referenceId,
    total: req.amountIQD,
    currency: 'IQD',
    customParameter: req.customerName || '',
    lineItem: [
      {
        label: 'Basket Value',
        amount: req.amountIQD,
        type: 'increase',
      },
    ],
    redirectionUrl: req.successUrl,
  };

  if (process.env.WAYL_WEBHOOK_URL) {
    body.webhookUrl = process.env.WAYL_WEBHOOK_URL;
  }

  if (process.env.WAYL_WEBHOOK_SECRET) {
    body.webhookSecret = process.env.WAYL_WEBHOOK_SECRET;
  }

  // 2. Execute the Wayl-specific request
  return await waylRequest<WaylLinkRecord>('/api/v1/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Fetches a single link object by your internal unique reference configuration.
 */
export async function getLinkByReference(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}`, { method: 'GET' });
}

/**
 * Retrieves a historical paginated matrix of created links filtered by status.
 */
export async function getLinks(
  params: { take?: number; skip?: number; statuses?: WaylLinkStatus[] } = {},
) {
  const query = new URLSearchParams();
  if (params.take) query.set('take', String(params.take));
  if (params.skip) query.set('skip', String(params.skip));
  if (params.statuses) {
    for (const status of params.statuses) {
      query.append('statuses', status);
    }
  }

  const path = `/api/v1/links?${query.toString()}`;
  return await waylRequest<WaylLinkRecord[]>(path, { method: 'GET' });
}

/**
 * Hard-invalidates an uncaptured link asset immediately.
 */
export async function invalidateLink(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}/invalidate`, {
    method: 'POST',
  });
}

/**
 * Conditionally invalidates an asset only if it resides in a pending evaluation state.
 */
export async function invalidateLinkIfPending(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}/invalidate-if-pending`, {
    method: 'POST',
  });
}
