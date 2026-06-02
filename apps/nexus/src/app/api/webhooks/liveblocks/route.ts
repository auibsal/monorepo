import { WebhookHandler } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@auibsal/database/server';

const webhookHandler = new WebhookHandler(process.env.LIVEBLOCKS_WEBHOOK_SECRET as string);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('webhook-signature');

  if (!signature) {
    return new NextResponse('Missing Signature', { status: 400 });
  }

  let event;
  try {
    // Cryptographically verify the request actually came from Liveblocks
    event = webhookHandler.verifyRequest({
      body,
      headers: { 'webhook-signature': signature },
    });
  } catch (err) {
    return new NextResponse('Invalid Webhook Signature', { status: 400 });
  }

  // Handle the Room Storage Update Event
  if (event.type === 'ydocUpdated') {
    const roomId = event.data.roomId; // This is your manuscript ID
    
    // In a production Yjs setup, you fetch the final text state from Liveblocks' REST API
    // and save it to your Supabase PostgreSQL database.
    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });
    
    try {
      // Fetch the Yjs document as plaintext or HTML from the Liveblocks API
      const documentText = await liveblocks.getYjsDocumentAsText(roomId);
      
      const supabase = createClient();
      await supabase
        .from('manuscripts')
        .update({ content: documentText, updated_at: new Date().toISOString() })
        .eq('id', roomId);
        
    } catch (dbError) {
      console.error('Failed to sync Liveblocks to Supabase:', dbError);
      return new NextResponse('Database Sync Failed', { status: 500 });
    }
  }

  return new NextResponse('Webhook Processed', { status: 200 });
}
