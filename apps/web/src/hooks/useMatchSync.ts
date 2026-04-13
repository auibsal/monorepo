import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/store/useGameStore';

export const useMatchSync = (matchId: string, myPlayerId: number) => {
  const supabase = createClient();
  const { 
    hands, boardTiles, openEnds, currentTurn, gameStatus, 
    playTile, passTurn 
  } = useGameStore();

  useEffect(() => {
    if (!matchId) return;

    // 1. Join the specific Match Channel
    const channel = supabase.channel(`match-${matchId}`, {
      config: { broadcast: { self: false } } // Don't listen to our own broadcasts
    });

    // 2. Listen for 'TILE_PLAYED' events from opponents
    channel.on(
      'broadcast',
      { event: 'TILE_PLAYED' },
      (payload) => {
        console.log('Opponent played a tile:', payload.data);
        // Force the local store to update using the opponent's move
        useGameStore.setState({
          hands: payload.data.hands,
          boardTiles: payload.data.boardTiles,
          openEnds: payload.data.openEnds,
          currentTurn: payload.data.currentTurn,
          consecutivePasses: 0,
          gameStatus: payload.data.gameStatus,
        });
      }
    );

    // 3. Listen for 'TURN_PASSED' events
    channel.on(
      'broadcast',
      { event: 'TURN_PASSED' },
      (payload) => {
        useGameStore.setState({
          currentTurn: payload.data.currentTurn,
          consecutivePasses: payload.data.consecutivePasses,
          gameStatus: payload.data.gameStatus,
        });
      }
    );

    // Subscribe to the network
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully connected to Match Arena: ${matchId}`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  // 4. The Broadcaster Functions
  // When YOU make a move, call this to tell the world
  const broadcastPlay = useCallback(async (newStoreState: any) => {
    const channel = supabase.channel(`match-${matchId}`);
    await channel.send({
      type: 'broadcast',
      event: 'TILE_PLAYED',
      data: newStoreState,
    });
  }, [matchId, supabase]);

  const broadcastPass = useCallback(async (newStoreState: any) => {
    const channel = supabase.channel(`match-${matchId}`);
    await channel.send({
      type: 'broadcast',
      event: 'TURN_PASSED',
      data: newStoreState,
    });
  }, [matchId, supabase]);

  return { broadcastPlay, broadcastPass };
};
