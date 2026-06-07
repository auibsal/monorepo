import { WebhookHandler } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@auibsal/auth/admin';
import { env } from '@auibsal/env';

const webhookHandler = new WebhookHandler(env.LIVEBLOCKS_WEBHOOK_SECRET as string);

export async function POST(request: NextRequest) {
  // 1. Extract the raw string for cryptographic verification
  const rawBody = await request.text();
  const signature = request.headers.get('webhook-signature');

  if (!signature) {
    return new NextResponse('Missing Signature', { status: 400 });
  }

  let event;
  try {
    // 2. Strictly pass 'rawBody' to satisfy the WebhookRequest interface
    event = webhookHandler.verifyRequest({
      rawBody, 
      headers: { 'webhook-signature': signature },
    });
  } catch (err) {
    return new NextResponse('Invalid Webhook Signature', { status: 400 });
  }

  // Handle the Room Storage Update Event
  if (event.type === 'ydocUpdated') {
    const roomId = event.data.roomId; 
    
    try {
      // 3. Fetch document from Liveblocks REST API as HTML
      // Tiptap explicitly stores its data in a Yjs fragment named "default"
      const response = await fetch(`https://api.liveblocks.io/v2/rooms/${roomId}/yjs/default?format=html`, {
        headers: {
          Authorization: `Bearer ${env.LIVEBLOCKS_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Yjs document: ${response.statusText}`);
      }

      const documentHTML = await response.text();
      
      // 4. Use admin client (bypasses cookies, RLS-safe for server-to-server)
      const supabase = createAdminClient();
      
      // 5. Sync the raw HTML back to your database (aligned perfectly with your SQL schema)
      const { error } = await supabase
        .from('submissions')
        .update({ 
          content: documentHTML 
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
