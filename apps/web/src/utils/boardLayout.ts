import { Domino } from '@repo/core';

export interface RenderedDomino {
    values: Domino;
    isDouble: boolean;
    isReversed: boolean;
}

export function calculateLinearBoard(board: Domino[]): RenderedDomino[] {
    if (board.length === 0) return [];

    const rendered: RenderedDomino[] = [];
    let currentRightEnd = board[0][1];

    // The first tile (spinner)
    rendered.push({
        values: board[0],
        isDouble: board[0][0] === board[0][1],
        isReversed: false,
    });

    // Calculate orientation for the rest of the train (assuming growing right for V1)
    for (let i = 1; i < board.length; i++) {
        const tile = board[i];
        const isDouble = tile[0] === tile[1];
        
        // If the left side of the new tile matches the right end of the board, it's normal.
        // If the right side of the new tile matches, we must visually reverse it.
        const isReversed = tile[1] === currentRightEnd;

        rendered.push({
            values: tile,
            isDouble,
            isReversed,
        });

        // Update the active right end to the outward-facing number
        currentRightEnd = isReversed ? tile[0] : tile[1];
    }

    return rendered;
}
