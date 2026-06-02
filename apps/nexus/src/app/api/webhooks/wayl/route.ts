import { verifyWaylWebhookSignature } from '@auibsal/payments/wayl/webhooks';
import { createClient } from '@auibsal/auth/server'; // Your Supabase admin client

export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); // Read the raw bytes for the crypto signature
    const signature = req.headers.get('x-wayl-signature-256');

    if (!signature) {
      return new Response('Missing Signature', { status: 401 });
    }

    // 1. Verify Authenticity (Mathematical check against forged payloads)
    const isValid = verifyWaylWebhookSignature(
      rawBody,
      signature,
      process.env.WAYL_WEBHOOK_SECRET!
    );

    if (!isValid) {
      return new Response('Cryptographic Verification Failed', { status: 403 });
    }

    // 2. Parse the verified data
    const event = JSON.parse(rawBody);

    // 3. Process the Event
    if (event.event === 'order.created' || event.paymentStatus === 'Complete') {
      const referenceId = event.referenceId; // e.g., The Submission ID or Order ID

      const supabase = await createClient();
      
      // Update our internal database
      await supabase
        .from('submissions')
        .update({ status: 'under_review' })
        .eq('id', referenceId);
        
      // (Optional) Trigger @auibsal/email here to send a receipt
    }

    // 4. Tell Wayl we successfully received the transmission
    return new Response('Webhook Acknowledged', { status: 200 });
    
  } catch (err) {
    console.error('Webhook processing failure:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
