import { verifyWaylWebhookSignature } from '@auibsal/payments/wayl/webhooks';
// 1. CRITICAL FIX: Import the Admin Client
import { createAdminClient } from '@auibsal/auth/admin'; 
import { env } from '@auibsal/env';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); 
    const signature = req.headers.get('x-wayl-signature-256');

    if (!signature) {
      return new Response('Missing Signature', { status: 401 });
    }

    const isValid = verifyWaylWebhookSignature(
      rawBody,
      signature,
      env.WAYL_WEBHOOK_SECRET!
    );

    if (!isValid) {
      return new Response('Cryptographic Verification Failed', { status: 403 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'order.created' || event.paymentStatus === 'Complete') {
      const referenceId = event.referenceId; 

      // 2. CRITICAL FIX: Use the Admin Client to bypass RLS for this background task
      const supabase = createAdminClient();
      
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'under_review' })
        .eq('id', referenceId);
        
      if (error) {
        console.error('Database Update Failed:', error);
        throw error;
      }
    }

    return new Response('Webhook Acknowledged', { status: 200 });
    
  } catch (err) {
    console.error('Webhook processing failure:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
