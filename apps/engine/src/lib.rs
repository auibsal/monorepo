pub mod bitboard;
pub mod state;
pub mod mcts;
pub mod nn;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::bitboard::{Domino, TileSet};
use crate::state::GameState;
use crate::mcts::ISMCTS;

// 1. Define the shape of the incoming JSON from Next.js
#[derive(Deserialize)]
struct BoardStatePayload {
    current_turn: usize,
    consecutive_passes: u32,
    my_hand: Vec<DominoPayload>,
    board_tiles: Vec<DominoPayload>,
}

#[derive(Deserialize)]
struct DominoPayload {
    high: u8,
    low: u8,
}

// 2. Define the shape of the outgoing JSON to Next.js
#[derive(Serialize)]
struct AnalysisResult {
    win_probability: f64,
    best_move: [u8; 2],
    depth: u32,
}

#[wasm_bindgen]
pub fn analyze_board_state(board_json: &str) -> String {
    // 3. Parse the JSON payload
    let payload: BoardStatePayload = match serde_json::from_str(board_json) {
        Ok(p) => p,
        Err(e) => return format!(r#"{{"error": "Failed to parse JSON: {}"}}"#, e),
    };

    let mut state = GameState::new();
    
    // Map the JS turn (1-4) to Rust's array index (0-3)
    let player_idx = if payload.current_turn > 0 { payload.current_turn - 1 } else { 0 };
    state.current_turn = player_idx;
    // state.consecutive_passes = payload.consecutive_passes; // Uncomment if implemented in GameState

    // 4. Translate the parsed JSON dominoes into the mathematical Bitboards
    let mut my_tiles = TileSet::empty();
    
    for d in payload.my_hand {
        let domino = Domino::new(d.high, d.low);
        my_tiles.add(&domino);
        // Remove these tiles from the "unknown" pool since we are holding them
        state.unplayed_tiles.remove(&domino);
    }
    state.hands[player_idx] = my_tiles;

    for d in payload.board_tiles {
        let domino = Domino::new(d.high, d.low);
        // Remove tiles already on the board from the "unknown" pool
        state.unplayed_tiles.remove(&domino);
    }

    // Boot up the IS-MCTS Engine (10,000 universes is perfect for web speed)
    let engine = ISMCTS::new(10_000);

    // Execute the search algorithm based on the REAL board state
    let (best_move, win_probability) = engine.search(&state);

    let result = AnalysisResult {
        win_probability,
        best_move: [best_move.high, best_move.low],
        depth: engine.iterations,
    };

    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"error": "Serialization failed"}"#.to_string())
}

// -----------------------------------------------------------------------------
// CORE ENGINE TESTS
// -----------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::bitboard::{Domino, TileSet};

    #[test]
    fn test_domino_to_index() {
        let d = Domino::new(0, 0);
        assert_eq!(d.to_index(), 0);

        let d = Domino::new(0, 1);
        assert_eq!(d.to_index(), 1);

        let d = Domino::new(1, 1);
        assert_eq!(d.to_index(), 2);

        let d = Domino::new(6, 6);
        assert_eq!(d.to_index(), 27);
    }

    #[test]
    fn test_tileset_operations() {
        let mut set = TileSet::empty();
        assert_eq!(set.count(), 0);

        let d1 = Domino::new(0, 0);
        let d2 = Domino::new(6, 6);

        set.add(&d1);
        assert!(set.contains(&d1));
        assert!(!set.contains(&d2));
        assert_eq!(set.count(), 1);

        set.add(&d2);
        assert!(set.contains(&d2));
        assert_eq!(set.count(), 2);

        set.remove(&d1);
        assert!(!set.contains(&d1));
        assert!(set.contains(&d2));
        assert_eq!(set.count(), 1);
    }
}
