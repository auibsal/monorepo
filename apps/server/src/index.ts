// apps/server/src/index.ts
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Use the SERVICE_ROLE key so the server can bypass RLS)
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ... inside your socket connection ...

async function handleGameEnd(roomId: string, game: DominoEngine2v2, winningSeat: 0|1|2|3, moveLog: any[]) {
    // Determine outcomes
    const teamAWin = winningSeat === 0 || winningSeat === 2;
    const outcomeStr = teamAWin ? 'team_a_win' : 'team_b_win'; // Make sure this matches your USER-DEFINED enum in Postgres
    
    // In a real scenario, playerSeats maps to real Supabase UUIDs
    // For testing, let's assume we mapped socket IDs to real DB UUIDs during the matchmaker phase:
    const p0_id = "uuid-for-player-0"; 
    const p1_id = "uuid-for-player-1";
    const p2_id = "uuid-for-player-2";
    const p3_id = "uuid-for-player-3";

    try {
        // 1. Insert into matches table
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert({
                team_a_player_1: p0_id,
                team_a_player_2: p2_id,
                team_b_player_1: p1_id,
                team_b_player_2: p3_id,
                outcome: outcomeStr, 
                score_differential: 100, // You'll calculate the actual pip difference here
                dpn_log: moveLog, // The jsonb move history goes here
                engine_analyzed: false
            })
            .select('id')
            .single();

        if (matchError) throw matchError;

        // 2. Insert into match_participants table
        // (Since the analysis engine is bypassed, we just pass 0 for rating changes for now)
        const participantsData = [
            { match_id: matchData.id, player_id: p0_id, team: 'TEAM_A', rating_change: 0, rating_after: 1500 },
            { match_id: matchData.id, player_id: p2_id, team: 'TEAM_A', rating_change: 0, rating_after: 1500 },
            { match_id: matchData.id, player_id: p1_id, team: 'TEAM_B', rating_change: 0, rating_after: 1500 },
            { match_id: matchData.id, player_id: p3_id, team: 'TEAM_B', rating_change: 0, rating_after: 1500 },
        ];

        const { error: partError } = await supabase
            .from('match_participants')
            .insert(participantsData);

        if (partError) throw partError;

        console.log(`Game over! Match ${matchData.id} saved to Supabase.`);
        
        // Clean up memory
        activeGames.delete(roomId);
        
    } catch (error) {
        console.error("Failed to save match to Supabase:", error);
    }
}
