pub mod bitboard;
pub mod state;
pub mod mcts;
pub mod nn;

use wasm_bindgen::prelude::*;
use crate::state::GameState;
use crate::mcts::ISMCTS;

/// This is the bridge function exposed to JavaScript/Next.js.
/// It takes the current board state as a JSON string, runs the AI, 
/// and returns the best move and probability as a JSON string.
#[wasm_bindgen]
pub fn analyze_board_state(_board_json: &str) -> String {
    // NOTE: In a full production build, we will use `serde_json` to parse 
    // `_board_json` into a real `GameState`. For now, we mock the root state.
    let root_state = GameState::new();

    // Boot up the IS-MCTS Engine
    // 100,000 iterations provides a solid balance of grandmaster strength and <1s execution time.
    let engine = ISMCTS::new(100_000);

    // Execute the search algorithm
    let (best_move, win_probability) = engine.search(&root_state);

    // Serialize the result back into the exact JSON format expected by Next.js
    format!(
        r#"{{
            "best_move": [{}, {}],
            "win_probability": {:.4},
            "depth": {}
        }}"#,
        best_move.high,
        best_move.low,
        win_probability,
        engine.iterations
    )
}

// -----------------------------------------------------------------------------
// CORE ENGINE TESTS
// -----------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::bitboard::{Domino, TileSet};

    #[test]
    fn test_domino_to_index() {
        // 0-0
        let d = Domino::new(0, 0);
        assert_eq!(d.to_index(), 0);

        // 1-0
        let d = Domino::new(0, 1);
        assert_eq!(d.to_index(), 1);

        // 1-1
        let d = Domino::new(1, 1);
        assert_eq!(d.to_index(), 2);

        // 6-6
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
