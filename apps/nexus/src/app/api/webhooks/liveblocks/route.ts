import { Liveblocks, WebhookHandler } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@auibsal/auth/admin';

const webhookHandler = new WebhookHandler(process.env.LIVEBLOCKS_WEBHOOK_SECRET as string);
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function POST(request: NextRequest) {
  // 1. Extract the raw string
  const rawBody = await request.text();
  const signature = request.headers.get('webhook-signature');

  if (!signature) {
    return new NextResponse('Missing Signature', { status: 400 });
  }

  let event;
  try {
    // 2. CRITICAL FIX: The SDK strictly requires the key to be named 'rawBody'
    event = webhookHandler.verifyRequest({
      rawBody: rawBody, 
      headers: { 'webhook-signature': signature },
    });
  } catch (err) {
    return new NextResponse('Invalid Webhook Signature', { status: 400 });
  }

  // Handle the Room Storage Update Event
  if (event.type === 'ydocUpdated') {
    const roomId = event.data.roomId; 
    
    try {
      const documentText = await liveblocks.getYjsDocumentAsText(roomId);
      const supabase = createAdminClient();
      
      const { error } = await supabase
        .from('submissions')
        .update({ 
          content: documentText, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', roomId);
        
      if (error) throw error;
        
    } catch (dbError) {
      console.error('Failed to sync Liveblocks to Supabase:', dbError);
      return new NextResponse('Database Sync Failed', { status: 500 });
    }
  }

  return new NextResponse('Webhook Processed', { status: 200 });
}
