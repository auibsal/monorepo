import { createPaymentLink } from './providers/wayl/links';
import type { 
  UniversalCheckoutRequest, 
  UniversalCheckoutResponse, 
  PaymentProvider 
} from './types';

// The global default if no specific provider is requested by the user
const PRIMARY_PROVIDER = (process.env.PRIMARY_PAYMENT_PROVIDER as PaymentProvider) || 'wayl';

/**
 * Universal Checkout Orchestrator
 * Routes the financial transaction to the active or requested payment gateway.
 */
export async function processCheckout(
  req: UniversalCheckoutRequest,
  requestedProvider?: PaymentProvider
): Promise<UniversalCheckoutResponse> {
  
  const targetProvider = requestedProvider || PRIMARY_PROVIDER;

  switch (targetProvider) {
    case 'wayl': {
      // Translate Universal Request to Wayl Payload
      const result = await createPaymentLink({
        amountIQD: req.amountIQD,
        referenceId: req.referenceId,
        successUrl: req.successUrl,
        customerName: req.customerName,
      });

      // Standardize Wayl Error Response
      if (!result.success) {
        return { success: false, provider: 'wayl', error: result.error };
      }

      // Standardize Wayl Success Response
      return {
        success: true,
        provider: 'wayl',
        checkoutUrl: result.data.url,
        transactionId: result.data.id,
      };
    }

    case 'zaincash': {
      // Placeholder for future ZainCash integration
      // const result = await createZainCashCheckout(req);
      return { success: false, provider: 'zaincash', error: 'ZainCash engine offline/unimplemented.' };
    }

    case 'superqi': {
      // Placeholder for future SuperQi integration
      return { success: false, provider: 'superqi', error: 'SuperQi engine offline/unimplemented.' };
    }

    case 'stripe': {
      // Placeholder for future Stripe integration
      return { success: false, provider: 'stripe', error: 'Stripe engine offline/unimplemented.' };
    }

    default:
      console.error(`[PAYMENTS] Unknown provider requested: ${targetProvider}`);
      return { 
        success: false, 
        provider: targetProvider, 
        error: 'Invalid payment provider requested.' 
      };
  }
}
