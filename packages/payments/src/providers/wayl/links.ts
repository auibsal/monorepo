import { waylRequest } from './client';
import type { WaylLinkCreationPayload, WaylLinkRecord, WaylLinkStatus } from '../../types';

/**
 * Validates authentication credentials directly against Wayl's validation sequence
 */
export async function verifyAuthKey(): Promise<boolean> {
  const result = await waylRequest<Record<string, never>>('/api/v1/verify-auth-key', { method: 'GET' });
  return result.success;
}

/**
 * Creates an authorized public checkout link
 */
export async function createPaymentLink(payload: WaylLinkCreationPayload) {
  if (payload.amountIQD < 1000) {
    return { success: false, error: 'Minimum transaction boundary is 1,000 IQD.' };
  }

  const body = {
    env: process.env.WAYL_ENV === 'live' ? 'live' : 'test',
    referenceId: payload.referenceId,
    total: payload.amountIQD,
    currency: 'IQD',
    customParameter: payload.customerName || '',
    lineItem: payload.lineItems || [
      {
        label: 'Basket Value',
        amount: payload.amountIQD,
        type: 'increase',
      },
    ],
    webhookUrl: payload.webhookUrl || process.env.WAYL_WEBHOOK_URL,
    webhookSecret: payload.webhookSecret || process.env.WAYL_WEBHOOK_SECRET,
    redirectionUrl: payload.successUrl,
  };

  return await waylRequest<WaylLinkRecord>('/api/v1/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Fetches a single link object by your internal unique reference configuration
 */
export async function getLinkByReference(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}`, { method: 'GET' });
}

/**
 * Retreives a historical paginated matrix of created links filtered by status
 */
export async function getLinks(params: { take?: number; skip?: number; statuses?: WaylLinkStatus[] } = {}) {
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
 * Hard-invalidates an uncaptured link asset immediately
 */
export async function invalidateLink(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}/invalidate`, { method: 'POST' });
}

/**
 * Conditionally invalidates an asset only if it resides in a pending evaluation state
 */
export async function invalidateLinkIfPending(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}/invalidate-if-pending`, { method: 'POST' });
}
