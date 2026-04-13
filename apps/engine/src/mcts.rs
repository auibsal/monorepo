use crate::bitboard::Domino;
use crate::state::GameState;
use std::collections::HashMap;
use rand::seq::SliceRandom; // For randomizing hidden tiles

#[derive(Debug)]
pub struct Node {
    pub visits: u32,
    pub wins: f64,
    pub children: HashMap<Domino, Node>,
    pub untried_moves: Vec<Domino>,
    pub player_just_moved: usize,
}

impl Node {
    pub fn new(state: &GameState) -> Self {
        Self {
            visits: 0,
            wins: 0.0,
            children: HashMap::new(),
            untried_moves: state.generate_legal_moves(),
            player_just_moved: (state.current_turn + 3) % 4, // The previous player
        }
    }

    /// Calculates the UCT value to balance exploration vs exploitation
    pub fn uct_value(&self, parent_visits: u32, exploration_param: f64) -> f64 {
        if self.visits == 0 {
            return f64::INFINITY; // Force exploration of unvisited nodes
        }
        let win_rate = self.wins / (self.visits as f64);
        let exploration = exploration_param * ((parent_visits as f64).ln() / (self.visits as f64)).sqrt();
        win_rate + exploration
    }
}
