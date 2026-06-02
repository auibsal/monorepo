import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@auibsal/database/server'; 

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { room } = await request.json();

  // Here we explicitly identify the user to Liveblocks. 
  // This powers the cursors and the @mentions.
  const { status, body } = await liveblocks.identifyUser(
    {
      userId: user.id, // The exact Supabase User ID
    },
    {
      userInfo: {
        name: user.user_metadata?.full_name || 'AUIB Editor',
        color: '#000000', // Brutalist default
        avatar: user.user_metadata?.avatar_url || 'https://auibsal.org/default-avatar.png',
      },
    }
  );

  return new NextResponse(body, { status });
}
