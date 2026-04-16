import { Domino, PlayerPosition } from './types';

export class DominoEngine2v2 {
    public board: Domino[] = [];
    public hands: Record<PlayerPosition, Domino[]> = { 0: [], 1: [], 2: [], 3: [] };
    public currentTurn: PlayerPosition = 0;
    
    // Board ends for quick validation
    public leftEnd: number | null = null;
    public rightEnd: number | null = null;
    
    // Tracking consecutive passes to detect a blocked game
    public consecutivePasses: number = 0;

    constructor() {
        this.initializeGame();
    }

    private initializeGame() {
        const allDominoes: Domino[] = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                allDominoes.push([i, j]);
            }
        }
        
        // Fisher-Yates shuffle
        for (let i = allDominoes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allDominoes[i], allDominoes[j]] = [allDominoes[j], allDominoes[i]];
        }

        // Deal 7 tiles to all 4 players (No boneyard in standard 2v2)
        for (let i = 0; i < 4; i++) {
            this.hands[i as PlayerPosition] = allDominoes.splice(0, 7);
        }
        
        // Logic to determine who goes first (usually the player with the [6,6])
        this.determineFirstPlayer();
    }

    private determineFirstPlayer() {
        for (let i = 0; i < 4; i++) {
            const hasDoubleSix = this.hands[i as PlayerPosition].some(d => d[0] === 6 && d[1] === 6);
            if (hasDoubleSix) {
                this.currentTurn = i as PlayerPosition;
                break;
            }
        }
    }

    // Simplified move validation
    public playDomino(player: PlayerPosition, domino: Domino, side: 'left' | 'right'): boolean {
        if (this.currentTurn !== player) return false;

        // Validation logic here (checking if ends match, etc.)
        // ...
        
        this.consecutivePasses = 0; // Reset passes on a successful move
        this.advanceTurn();
        return true;
    }

    public passTurn(player: PlayerPosition): boolean {
        if (this.currentTurn !== player) return false;
        
        // Ensure player actually HAS no valid moves before allowing a pass
        if (this.hasValidMove(player)) return false;

        this.consecutivePasses++;
        this.advanceTurn();
        
        // If 4 consecutive passes occur, the game is blocked
        if (this.consecutivePasses >= 4) {
            this.handleBlockedGame();
        }
        return true;
    }

    private advanceTurn() {
        this.currentTurn = ((this.currentTurn + 1) % 4) as PlayerPosition;
    }

    private hasValidMove(player: PlayerPosition): boolean {
        // Logic to check if any domino in player's hand matches leftEnd or rightEnd
        return true; // Placeholder
    }

    private handleBlockedGame() {
        // Logic to count pips (dots) in hands. Lowest team score wins the round.
    }
}
