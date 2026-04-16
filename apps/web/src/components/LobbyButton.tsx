// apps/web/components/LobbyButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export default function LobbyButton() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const socketInstance = io('http://localhost:3001');
        setSocket(socketInstance);

        socketInstance.on('match_found', (data: { roomId: string, seat: number }) => {
            // Success! The server grouped us. Route to the live board.
            router.push(`/room/${data.roomId}`);
        });

        return () => { socketInstance.disconnect(); };
    }, [router]);

    const handleJoinQueue = () => {
        setIsSearching(true);
        // Pass fake data for now. We will wire up actual user accounts later.
        socket?.emit('join_queue', { userId: 'guest_123', elo: 1200 });
    };

    return (
        <button 
            onClick={handleJoinQueue}
            disabled={isSearching}
            className={`px-8 py-4 font-mono font-bold uppercase tracking-widest text-zinc-900 shadow-[4px_4px_0px_#3f3f46] transition-transform hover:-translate-y-1 ${
                isSearching ? 'bg-zinc-500 cursor-wait' : 'bg-zinc-100 hover:bg-white'
            }`}
        >
            {isSearching ? 'SEARCHING FOR OPPONENTS...' : 'PLAY 2v2'}
        </button>
    );
}
