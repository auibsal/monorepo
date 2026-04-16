// packages/core/src/DominoEngine.ts
import { Domino, PlayerPosition } from './types';

export class DominoEngine2v2 {
    public board: Domino[] = [];
    public hands: Record<PlayerPosition, Domino[]> = { 0: [], 1: [], 2: [], 3: [] };
    public currentTurn: PlayerPosition = 0;
    public leftEnd: number | null = null;
    public rightEnd: number | null = null;
    public consecutivePasses: number = 0;
    public isGameOver: boolean = false;
    public winner: 'TEAM_A' | 'TEAM_B' | 'DRAW' | null = null;

    constructor() {
        this.initializeGame();
    }

    private initializeGame() {
        const allDominoes: Domino[] = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) allDominoes.push([i, j]);
        }
        
        // Fisher-Yates shuffle
        for (let i = allDominoes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allDominoes[i], allDominoes[j]] = [allDominoes[j], allDominoes[i]];
        }

        for (let i = 0; i < 4; i++) {
            this.hands[i as PlayerPosition] = allDominoes.splice(0, 7);
        }
        
        // Start with the player holding [6,6]
        for (let i = 0; i < 4; i++) {
            if (this.hands[i as PlayerPosition].some(d => d[0] === 6 && d[1] === 6)) {
                this.currentTurn = i as PlayerPosition;
                break;
            }
        }
    }

    public playDomino(player: PlayerPosition, domino: Domino, side: 'left' | 'right'): boolean {
        if (this.currentTurn !== player || this.isGameOver) return false;

        // Ensure player actually has the tile
        const hasTile = this.hands[player].some(d => 
            (d[0] === domino[0] && d[1] === domino[1]) || (d[0] === domino[1] && d[1] === domino[0])
        );
        if (!hasTile) return false;

        // First Move Logic
        if (this.board.length === 0) {
            this.board = [domino];
            this.leftEnd = domino[0];
            this.rightEnd = domino[1];
            this.finalizeMove(player, domino);
            return true;
        }

        // Standard Matching Logic
        const matchValue = side === 'left' ? this.leftEnd : this.rightEnd;
        if (domino[0] !== matchValue && domino[1] !== matchValue) return false;

        if (side === 'left') {
            this.board = [domino, ...this.board];
            this.leftEnd = domino[0] === matchValue ? domino[1] : domino[0];
        } else {
            this.board = [...this.board, domino];
            this.rightEnd = domino[0] === matchValue ? domino[1] : domino[0];
        }

        this.finalizeMove(player, domino);
        return true;
    }

    private finalizeMove(player: PlayerPosition, domino: Domino) {
        // Remove from hand
        this.hands[player] = this.hands[player].filter(d => 
            !((d[0] === domino[0] && d[1] === domino[1]) || (d[0] === domino[1] && d[1] === domino[0]))
        );

        this.consecutivePasses = 0;

        // Check for "Capicúa" or normal win
        if (this.hands[player].length === 0) {
            this.isGameOver = true;
            this.winner = (player === 0 || player === 2) ? 'TEAM_A' : 'TEAM_B';
            return;
        }

        this.advanceTurn();
    }

    public passTurn(player: PlayerPosition): boolean {
        if (this.currentTurn !== player || this.isGameOver) return false;
        
        // Strict Federation Rule: You CANNOT pass if you have a valid move
        if (this.hasValidMove(player)) return false;

        this.consecutivePasses++;
        if (this.consecutivePasses >= 4) {
            this.handleBlockedGame();
        } else {
            this.advanceTurn();
        }
        return true;
    }

    private hasValidMove(player: PlayerPosition): boolean {
        if (this.board.length === 0) return true; // Can always play first move
        return this.hands[player].some(d => 
            d[0] === this.leftEnd || d[1] === this.leftEnd || 
            d[0] === this.rightEnd || d[1] === this.rightEnd
        );
    }

    private advanceTurn() {
        this.currentTurn = ((this.currentTurn + 1) % 4) as PlayerPosition;
    }

    private handleBlockedGame() {
        this.isGameOver = true;
        
        const scoreA = this.calculateTeamScore([0, 2]);
        const scoreB = this.calculateTeamScore([1, 3]);

        if (scoreA < scoreB) this.winner = 'TEAM_A';
        else if (scoreB < scoreA) this.winner = 'TEAM_B';
        else this.winner = 'DRAW';
    }

    private calculateTeamScore(players: number[]): number {
        return players.reduce((sum, p) => {
            return sum + this.hands[p as PlayerPosition].reduce((pSum, d) => pSum + d[0] + d[1], 0);
        }, 0);
    }
}
