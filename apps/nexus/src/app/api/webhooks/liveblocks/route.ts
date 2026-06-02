import { Liveblocks, WebhookHandler } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@auibsal/auth/admin';

const webhookHandler = new WebhookHandler(process.env.LIVEBLOCKS_WEBHOOK_SECRET as string);
const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('webhook-signature');

  if (!signature) {
    return new NextResponse('Missing Signature', { status: 400 });
  }

  let event;
  try {
    event = webhookHandler.verifyRequest({
      body,
      headers: { 'webhook-signature': signature },
    });
  } catch (err) {
    return new NextResponse('Invalid Webhook Signature', { status: 400 });
  }

  // Handle the Room Storage Update Event
  if (event.type === 'ydocUpdated') {
    const roomId = event.data.roomId; 
    
    try {
      // 1. Fetch document from Liveblocks API
      const documentText = await liveblocks.getYjsDocumentAsText(roomId);
      
      // 2. Use admin client (bypasses cookies, RLS-safe for server-to-server)
      const supabase = createAdminClient();
      
      // 3. Sync to your database
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
