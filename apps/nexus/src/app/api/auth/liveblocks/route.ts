import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@auibsal/auth/admin';

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
  // Use the admin client to verify the user via the provided token
  const supabase = createAdminClient();
  
  // Retrieve the auth token from the request header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Use the admin client to verify the user via the provided JWT
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

  if (error || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { room } = await request.json();

  // Identify the user to Liveblocks. 
  // We explicitly include groupIds: [] to satisfy the strict Identity interface requirement.
  const { status, body } = await liveblocks.identifyUser(
    { 
      userId: user.id,
      groupIds: [] 
    },
    {
      userInfo: {
        name: user.user_metadata?.full_name || 'AUIB Editor',
        color: '#000000',
        avatar: user.user_metadata?.avatar_url || 'https://auibsal.org/default-avatar.png',
      },
    }
  );

  return new NextResponse(body, { status });
}
