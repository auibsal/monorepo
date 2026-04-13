interface PlayerState {
  id: string;
  currentRating: number;
  matchesPlayed: number;
}

interface Team {
  players: PlayerState[];
}

// Determine the K-Factor based on player experience
// New players experience higher rating volatility to quickly find their true rank
function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed < 10) return 40; // Provisional/Placement matches
  if (matchesPlayed < 50) return 24; // Standard progression
  return 16; // Veteran stability
}

export function calculatePairsMatch(
  teamA: Team, 
  teamB: Team, 
  teamA_Won: boolean
) {
  // 1. Calculate Average Team Ratings
  const rA = (teamA.players[0].currentRating + teamA.players[1].currentRating) / 2;
  const rB = (teamB.players[0].currentRating + teamB.players[1].currentRating) / 2;

  // 2. Calculate Expected Win Probability for Team A and B
  const expectedA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  const expectedB = 1 - expectedA;

  // 3. Set Actual Scores (1 for win, 0 for loss)
  const scoreA = teamA_Won ? 1 : 0;
  const scoreB = teamA_Won ? 0 : 1;

  // 4. Calculate individual rating changes
  const processTeam = (team: Team, expected: number, actual: number) => {
    return team.players.map(player => {
      const k = getKFactor(player.matchesPlayed);
      const ratingChange = k * (actual - expected);
      
      return {
        playerId: player.id,
        oldRating: player.currentRating,
        newRating: player.currentRating + ratingChange,
        change: ratingChange
      };
    });
  };

  return {
    teamAResults: processTeam(teamA, expectedA, scoreA),
    teamBResults: processTeam(teamB, expectedB, scoreB)
  };
}
