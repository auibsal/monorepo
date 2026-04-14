pub mod bitboard;
pub mod state;
pub mod mcts;
pub mod nn;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::bitboard::{Domino, TileSet};
use crate::state::GameState;
use crate::mcts::ISMCTS;

#[derive(Deserialize)]
struct BoardStatePayload {
    current_turn: usize,
    consecutive_passes: u32,
    open_ends: [Option<u8>; 2], // Capturing the table ends from JS
    my_hand: Vec<DominoPayload>,
    board_tiles: Vec<DominoPayload>,
}

#[derive(Deserialize)]
struct DominoPayload {
    high: u8,
    low: u8,
}

#[derive(Serialize)]
struct AnalysisResult {
    win_probability: f64,
    best_move: [u8; 2],
    depth: u32,
}

#[wasm_bindgen]
pub fn analyze_board_state(board_json: &str) -> String {
    let payload: BoardStatePayload = match serde_json::from_str(board_json) {
        Ok(p) => p,
        Err(e) => return format!(r#"{{"error": "Failed to parse JSON: {}"}}"#, e),
    };

    let mut state = GameState::new();
    
    let player_idx = if payload.current_turn > 0 { payload.current_turn - 1 } else { 0 };
    state.current_turn = player_idx;
    state.consecutive_passes = payload.consecutive_passes;

    // Safely map the Next.js array [6, 2] into the Rust Engine Tuple (6, 2)
    if let (Some(e1), Some(e2)) = (payload.open_ends[0], payload.open_ends[1]) {
        state.open_ends = Some((e1, e2));
    } else {
        state.open_ends = None;
    }

    let mut my_tiles = TileSet::empty();
    
    for d in payload.my_hand {
        let domino = Domino::new(d.high, d.low);
        my_tiles.add(&domino);
        state.unplayed_tiles.remove(&domino);
    }
    state.hands[player_idx] = my_tiles;

    for d in payload.board_tiles {
        let domino = Domino::new(d.high, d.low);
        state.unplayed_tiles.remove(&domino);
    }

    let engine = ISMCTS::new(10_000);
    let (best_move, win_probability) = engine.search(&state);

    let result = AnalysisResult {
        win_probability,
        best_move: [best_move.high, best_move.low],
        depth: engine.iterations,
    };

    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"error": "Serialization failed"}"#.to_string())
}
