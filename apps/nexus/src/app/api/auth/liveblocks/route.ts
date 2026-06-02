import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@auibsal/database/server'; // Assuming your Supabase server client path

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: NextRequest) {
  // 1. Verify the user is authenticated in Supabase
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Extract the room ID the user is trying to access
  const { room } = await request.json();

  // 3. (Optional but strictly recommended) Verify in Supabase that this user has permission to edit this specific manuscript/room.
  // const hasPermission = await checkUserPermission(user.id, room);
  // if (!hasPermission) return new NextResponse('Forbidden', { status: 403 });

  // 4. Generate the cryptographic token for Liveblocks
  const session = liveblocks.prepareSession(
    user.id,
    {
      userInfo: {
        name: user.user_metadata?.full_name || 'Anonymous Editor',
        color: '#000000', // Brutalist default, can be dynamic based on user ID
      },
    }
  );

  // Grant the user write access to this specific room
  session.allow(room, session.FULL_ACCESS);

  // 5. Authorize and return the token to the @auibsal/editor package
  const { status, body } = await session.authorize();
  
  return new NextResponse(body, { status });
}
