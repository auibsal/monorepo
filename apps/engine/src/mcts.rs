use crate::bitboard::{Domino, TileSet};
use crate::state::GameState;
use rand::seq::SliceRandom;
use rand::thread_rng;

/// Represents a single node in the Monte Carlo Search Tree
#[derive(Debug, Clone)]
pub struct Node {
    pub parent: Option<usize>,
    pub move_played: Option<Domino>, // The move that led to this node
    pub children: Vec<usize>,        // Indices of child nodes in the arena
    pub visits: u32,
    pub wins: f64,
    pub untried_moves: Vec<Domino>,
    pub player_just_moved: usize,
}

impl Node {
    pub fn new(state: &GameState, parent: Option<usize>, move_played: Option<Domino>) -> Self {
        Self {
            parent,
            move_played,
            children: Vec::new(),
            visits: 0,
            wins: 0.0,
            untried_moves: state.generate_legal_moves(),
            player_just_moved: (state.current_turn + 3) % 4, // The player who just went
        }
    }

    /// Upper Confidence Bound (UCT) formula to balance exploring vs exploiting
    pub fn uct_value(&self, parent_visits: u32, exploration_param: f64) -> f64 {
        if self.visits == 0 {
            return f64::INFINITY;
        }
        let win_rate = self.wins / (self.visits as f64);
        let exploration = exploration_param * ((parent_visits as f64).ln() / (self.visits as f64)).sqrt();
        win_rate + exploration
    }
}

/// The Information Set Monte Carlo Tree Search Engine
pub struct ISMCTS {
    pub iterations: u32,
    pub exploration_param: f64,
}

impl ISMCTS {
    pub fn new(iterations: u32) -> Self {
        Self { 
            iterations, 
            exploration_param: 1.414 // sqrt(2) is the standard UCT constant
        }
    }

    /// Executes the search and returns the (Best Move, Win Probability)
    pub fn search(&self, root_state: &GameState) -> (Domino, f64) {
        let mut tree: Vec<Node> = Vec::with_capacity(self.iterations as usize);
        
        // Push the root node into the arena
        tree.push(Node::new(root_state, None, None));
        let root_player_team = root_state.current_turn % 2;

        for _ in 0..self.iterations {
            // PHASE 1: DETERMINIZATION
            // Create a universe where hidden tiles are randomly assigned
            let mut state = self.determinize(root_state);
            let mut node_idx = 0; // Start at root

            // PHASE 2: SELECTION
            // Walk down the tree picking the best UCT nodes until we find one with untried moves
            while tree[node_idx].untried_moves.is_empty() && !tree[node_idx].children.is_empty() {
                let parent_visits = tree[node_idx].visits;
                
                // Find the child with the highest UCT value
                let mut best_child_idx = tree[node_idx].children[0];
                let mut best_uct = f64::NEG_INFINITY;

                for &child_idx in &tree[node_idx].children {
                    let uct = tree[child_idx].uct_value(parent_visits, self.exploration_param);
                    if uct > best_uct {
                        best_uct = uct;
                        best_child_idx = child_idx;
                    }
                }

                node_idx = best_child_idx;
                
                // Apply the move to our virtual state
                if let Some(m) = tree[node_idx].move_played {
                    // Note: Needs the end it was played on. Assuming basic apply for now.
                    // In a full implementation, you must track which end the domino was played on.
                    state.apply_move(m, m.high); 
                }
            }

            // PHASE 3: EXPANSION
            // If the node has untried moves, pick one randomly and expand the tree
            if !tree[node_idx].untried_moves.is_empty() {
                let mut rng = thread_rng();
                // Pop a random untried move
                let move_idx = rng.gen_range(0..tree[node_idx].untried_moves.len());
                let m = tree[node_idx].untried_moves.swap_remove(move_idx);
                
                state.apply_move(m, m.high);

                // Create the new child node and add it to the arena
                let child_node = Node::new(&state, Some(node_idx), Some(m));
                let child_idx = tree.len();
                tree.push(child_node);
                
                // Link parent to child
                tree[node_idx].children.push(child_idx);
                node_idx = child_idx;
            }

            // PHASE 4: SIMULATION (Rollout)
            // Play the game out completely randomly until a terminal state is reached
            let mut rollout_state = state.clone();
            let mut consecutive_passes = 0;

            while consecutive_passes < 4 {
                let legal_moves = rollout_state.generate_legal_moves();
                if legal_moves.is_empty() {
                    consecutive_passes += 1;
                    rollout_state.current_turn = (rollout_state.current_turn + 1) % 4;
                } else {
                    consecutive_passes = 0;
                    let mut rng = thread_rng();
                    let random_move = *legal_moves.choose(&mut rng).unwrap();
                    rollout_state.apply_move(random_move, random_move.high);
                }
                
                // If someone empties their hand, the game is over
                if rollout_state.hands[rollout_state.player_just_moved].count() == 0 {
                    break;
                }
            }

            // Determine if the root player's team won
            // 1.0 for Win, 0.0 for Loss, 0.5 for Draw
            let result = self.evaluate_simulation(&rollout_state, root_player_team);

            // PHASE 5: BACKPROPAGATION
            // Walk back up the tree arena updating visits and win ratios
            let mut current_idx = Some(node_idx);
            while let Some(idx) = current_idx {
                tree[idx].visits += 1;
                
                // If the player who just moved is on our team, a win is good for this node
                let node_team = tree[idx].player_just_moved % 2;
                if node_team == root_player_team {
                    tree[idx].wins += result;
                } else {
                    tree[idx].wins += 1.0 - result; // Invert result for the opponent
                }

                current_idx = tree[idx].parent;
            }
        }

        // Search complete. Find the most robust move (most visits) from the root.
        let mut best_move = Domino::new(0, 0);
        let mut max_visits = 0;
        let mut win_prob = 0.5;

        for &child_idx in &tree[0].children {
            let child = &tree[child_idx];
            if child.visits > max_visits {
                max_visits = child.visits;
                best_move = child.move_played.unwrap();
                win_prob = child.wins / (child.visits as f64);
            }
        }

        (best_move, win_prob)
    }

    /// Creates a valid random universe based on known information
    fn determinize(&self, state: &GameState) -> GameState {
        let mut virtual_state = state.clone();
        
        // 1. Extract all unplayed tiles into a vector
        let mut unassigned_tiles = Vec::new();
        for high in 0..=6 {
            for low in 0..=high {
                let d = Domino::new(high, low);
                if virtual_state.unplayed_tiles.contains(d) {
                    unassigned_tiles.push(d);
                }
            }
        }

        // 2. Shuffle the tiles to create a random universe
        let mut rng = thread_rng();
        unassigned_tiles.shuffle(&mut rng);

        // 3. Distribute them to opponents who need tiles
        // Note: In a production engine, you must check `virtual_state.passed_players`
        // here to ensure you don't deal a tile to a player who has proven they don't have it.
        for player_idx in 0..4 {
            if player_idx == state.current_turn { continue; } // Keep root player's hand exact

            // Assuming a target hand size of 7 minus played tiles for simplicity
            let target_size = 7; // Needs logic to track how many tiles opponents hold
            let current_size = virtual_state.hands[player_idx].count();
            
            for _ in current_size..target_size {
                if let Some(tile) = unassigned_tiles.pop() {
                    virtual_state.hands[player_idx].add(tile);
                }
            }
        }

        virtual_state
    }

    /// Evaluates the terminal state to determine win/loss for the root team
    fn evaluate_simulation(&self, terminal_state: &GameState, root_team: usize) -> f64 {
        // Simplified Logic: Check which team has the fewest tiles/pips left
        let team_0_tiles = terminal_state.hands[0].count() + terminal_state.hands[2].count();
        let team_1_tiles = terminal_state.hands[1].count() + terminal_state.hands[3].count();

        if team_0_tiles < team_1_tiles {
            if root_team == 0 { 1.0 } else { 0.0 }
        } else if team_1_tiles < team_0_tiles {
            if root_team == 1 { 1.0 } else { 0.0 }
        } else {
            0.5 // Dead heat / Tie
        }
    }
}
