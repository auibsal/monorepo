// packages/payments/src/providers/wayl.ts

import type { StandardCheckoutRequest, StandardCheckoutResponse } from '../types';

// The environment variables provided by the consumer application (Nexus)
const WAYL_API_KEY = process.env.WAYL_API_KEY;
const WAYL_ENV = process.env.WAYL_ENV === 'live' ? 'live' : 'test';

const WAYL_BASE_URL = WAYL_ENV === 'live' 
  ? 'https://api.thewayl.com' 
  : 'https://api.thewayl-staging.com';

export async function createWaylCheckout(req: StandardCheckoutRequest): Promise<StandardCheckoutResponse> {
  if (!WAYL_API_KEY) {
    console.error('[PAYMENTS] WAYL_API_KEY is missing from environment.');
    return { success: false, error: 'Payment gateway configuration error.' };
  }

  // Wayl strictly enforces a minimum transaction limit
  if (req.amountIQD < 1000) {
    return { success: false, error: 'Transaction amount must be at least 1,000 IQD.' };
  }

  try {
    const payload = {
      env: WAYL_ENV,
      referenceId: req.referenceId,
      total: req.amountIQD,
      currency: 'IQD', // Strictly enforced by the Wayl spec
      redirectionUrl: req.successUrl,
      customParameter: req.customerName ? `Customer: ${req.customerName}` : undefined,
      // Pass the webhooks dynamically, falling back to environment variables
      webhookUrl: req.webhookUrl || process.env.WAYL_WEBHOOK_URL,
      webhookSecret: req.webhookSecret || process.env.WAYL_WEBHOOK_SECRET,
    };

    const response = await fetch(`${WAYL_BASE_URL}/api/v1/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Standard OpenAPI security scheme mapping
        'Authorization': `Bearer ${WAYL_API_KEY}` 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WAYL API ERROR]', data);
      return { success: false, error: data.message || 'Wayl link creation failed.' };
    }

    return {
      success: true,
      checkoutUrl: data.data.url,       // The link to redirect the customer to
      transactionId: data.data.id       // Wayl's internal tracking ID
    };

  } catch (error) {
    console.error('[WAYL NETWORK ERROR]', error);
    return { success: false, error: 'Network failure communicating with Wayl.' };
  }
}

// ------------------------------------------------------------------
// Bonus: Wayl Link Invalidation
// ------------------------------------------------------------------
export async function invalidateWaylCheckout(referenceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${WAYL_BASE_URL}/api/v1/links/${referenceId}/invalidate-if-pending`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAYL_API_KEY}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}
