import { createPaymentLink } from './providers/wayl/links';
import type { WaylLinkCreationPayload } from './types';

export async function processCheckout(payload: WaylLinkCreationPayload) {
  // Currently defaulting strictly to Wayl's payment adapter matrix
  return await createPaymentLink(payload);
}
