// packages/payments/src/types.ts

export type PaymentProvider = 'wayl' | 'zaincash' | 'stripe' | 'superqi';

export interface UniversalCheckoutRequest {
  amountIQD: number;
  referenceId: string;
  successUrl: string;
  customerName?: string;
}

export interface UniversalCheckoutResponse {
  success: boolean;
  provider: PaymentProvider;
  checkoutUrl?: string;
  transactionId?: string;
  error?: string;
}
