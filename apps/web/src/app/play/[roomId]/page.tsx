// apps/web/app/room/[roomId]/page.tsx
import GameBoard from '../../../components/GameBoard';

// Next.js App Router dynamic page
export default function RoomPage({ params }: { params: { roomId: string } }) {
    return (
        // Pass the URL parameter (the match ID) down to our React component
        <GameBoard roomId={params.roomId} />
    );
}
