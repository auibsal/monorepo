export type WaylEnvironment = 'live' | 'test';

export type WaylLinkStatus =
  | 'Created'
  | 'Pending'
  | 'Processing'
  | 'Complete'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected'
  | 'Returned';

export type WaylRefundStatus = 'Requested' | 'Refunded' | 'Rejected' | 'Cancelled';

export interface WaylLineItem {
  label: string;
  amount: number;
  type: 'increase' | 'decrease';
}

// Creation Request Object
export interface WaylLinkCreationPayload {
  amountIQD: number;
  referenceId: string;
  successUrl: string;
  customerName?: string;
  lineItems?: WaylLineItem[];
  webhookUrl?: string;
  webhookSecret?: string;
}

// Complete Wayl Link Record Schema
export interface WaylLinkRecord {
  id: string;
  code: string;
  referenceId: string;
  total: string; // Wayl serializes this to text in the JSON body
  currency: 'IQD';
  type: string;
  status: WaylLinkStatus;
  paymentMethod: string | null;
  url: string;
  webhookUrl?: string;
  redirectionUrl?: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Complete Wayl Refund Schema
export interface WaylRefundRecord {
  id: string;
  linkId: string;
  referenceId: string;
  amount: number;
  reason: string;
  initiatedBy: 'Merchant' | string;
  status: WaylRefundStatus;
}
