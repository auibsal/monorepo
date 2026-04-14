use crate::bitboard::{Domino, TileSet, Action};
use crate::state::GameState;
use crate::nn::Brain;
use rand::seq::SliceRandom;
use rand::thread_rng;
use rand::Rng;

#[derive(Debug, Clone)]
pub struct Node {
    pub parent: Option<usize>,
    pub move_played: Option<Action>, 
    pub children: Vec<usize>,
    pub visits: u32,
    pub wins: f64,
    pub untried_moves: Vec<Action>,  
    pub player_just_moved: usize,
}

impl Node {
    pub fn new(state: &GameState, parent: Option<usize>, move_played: Option<Action>) -> Self {
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

    pub fn uct_value(&self, parent_visits: u32, exploration_param: f64) -> f64 {
        if self.visits == 0 {
            return f64::INFINITY;
        }
        let win_rate = self.wins / (self.visits as f64);
        let exploration = exploration_param * ((parent_visits as f64).ln() / (self.visits as f64)).sqrt();
        win_rate + exploration
    }
}

pub struct ISMCTS {
    pub iterations: u32,
    pub exploration_param: f64,
    pub brain: Brain, 
}

impl ISMCTS {
    pub fn new(iterations: u32) -> Self {
        Self { 
            iterations, 
            exploration_param: 1.414, 
            brain: Brain::new(),      
        }
    }

    pub fn search(&self, root_state: &GameState) -> (Action, f64) {
        let mut tree: Vec<Node> = Vec::with_capacity(self.iterations as usize);
        
        tree.push(Node::new(root_state, None, None));
        let root_player_team = root_state.current_turn % 2;

        for _ in 0..self.iterations {
            // PHASE 1: DETERMINIZATION
            let mut state = self.determinize(root_state);
            let mut node_idx = 0; 

            // PHASE 2: SELECTION
            while tree[node_idx].untried_moves.is_empty() && !tree[node_idx].children.is_empty() {
                let parent_visits = tree[node_idx].visits;
                
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
                
                if let Some(m) = tree[node_idx].move_played {
                    state.apply_move(m); 
                }
            }

            // PHASE 3: EXPANSION
            if !tree[node_idx].untried_moves.is_empty() {
                let mut rng = thread_rng();
                let move_idx = rng.gen_range(0..tree[node_idx].untried_moves.len());
                let m = tree[node_idx].untried_moves.swap_remove(move_idx);
                
                state.apply_move(m);

                let child_node = Node::new(&state, Some(node_idx), Some(m));
                let child_idx = tree.len();
                tree.push(child_node);
                
                tree[node_idx].children.push(child_idx);
                node_idx = child_idx;
            }

            // PHASE 4: NEURAL EVALUATION 
            let tensor_input = self.state_to_tensor(&state);
            let (_policy, net_value) = self.brain.evaluate(&tensor_input);
            let mut result = (net_value + 1.0) / 2.0;

            let current_team = state.current_turn % 2;
            if current_team != root_player_team {
                result = 1.0 - result;
            }

            // PHASE 5: BACKPROPAGATION
            let mut current_idx = Some(node_idx);
            while let Some(idx) = current_idx {
                tree[idx].visits += 1;
                
                let node_team = tree[idx].player_just_moved % 2;
                if node_team == root_player_team {
                    tree[idx].wins += result as f64;
                } else {
                    tree[idx].wins += 1.0 - (result as f64);
                }

                current_idx = tree[idx].parent;
            }
        }

        let mut best_move = None;
        let mut max_visits = 0;
        let mut win_prob = 0.5;

        for &child_idx in &tree[0].children {
            let child = &tree[child_idx];
            if child.visits > max_visits {
                max_visits = child.visits;
                best_move = child.move_played;
                win_prob = child.wins / (child.visits as f64);
            }
        }

        // Safe fallback if the game is already in a terminal state
        let final_action = best_move.unwrap_or(Action { 
            tile: Domino::new(0, 0), 
            target_pip: None 
        });

        (final_action, win_prob)
    }

    fn determinize(&self, state: &GameState) -> GameState {
        let mut virtual_state = state.clone();
        
        let mut unassigned_tiles = Vec::new();
        for high in 0..=6 {
            for low in 0..=high {
                let d = Domino::new(high, low);
                if virtual_state.unplayed_tiles.contains(&d) {
                    unassigned_tiles.push(d);
                }
            }
        }

        let mut rng = thread_rng();
        unassigned_tiles.shuffle(&mut rng);

        for player_idx in 0..4 {
            if player_idx == state.current_turn { continue; } 

            let target_size = 7; 
            let current_size = virtual_state.hands[player_idx].count();
            
            for _ in current_size..target_size {
                if let Some(tile) = unassigned_tiles.pop() {
                    virtual_state.hands[player_idx].add(&tile);
                }
            }
        }

        virtual_state
    }

    fn state_to_tensor(&self, state: &GameState) -> [f32; 81] {
        let tensor = [0.0; 81];
        // Tensor features logic mapping 
        tensor
    }
}
