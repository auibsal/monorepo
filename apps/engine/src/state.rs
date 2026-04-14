use crate::bitboard::{Domino, TileSet, Action}; // <-- Import Action

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameState {
    pub hands: [TileSet; 4],
    pub unplayed_tiles: TileSet,
    pub open_ends: Option<(u8, u8)>,
    pub current_turn: usize,
    pub passed_players: [u32; 4],
    pub consecutive_passes: u32,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            hands: [TileSet::empty(); 4],
            unplayed_tiles: TileSet(0x0FFFFFFF),
            open_ends: None,
            current_turn: 0,
            passed_players: [0; 4],
            consecutive_passes: 0,
        }
    }

    // Now returns Vec<Action>
    pub fn generate_legal_moves(&self) -> Vec<Action> {
        let mut actions = Vec::with_capacity(14); // Max 7 tiles * 2 ends
        let my_hand = &self.hands[self.current_turn];

        let mut all_hand_tiles = Vec::new();
        for high in 0..=6 {
            for low in 0..=high {
                let d = Domino::new(high, low);
                if my_hand.contains(&d) {
                    all_hand_tiles.push(d);
                }
            }
        }

        if let Some((end1, end2)) = self.open_ends {
            for d in all_hand_tiles {
                // Can we play it on the first end?
                if d.high == end1 || d.low == end1 {
                    actions.push(Action { tile: d, target_pip: Some(end1) });
                }
                // Can we play it on the second end? (Avoid duplicates if ends are identical)
                if end1 != end2 && (d.high == end2 || d.low == end2) {
                    actions.push(Action { tile: d, target_pip: Some(end2) });
                }
            }
        } else {
            // First turn of the round
            for d in all_hand_tiles {
                actions.push(Action { tile: d, target_pip: None });
            }
        }

        actions
    }

    // Now accepts an Action instead of (Domino, u8)
    pub fn apply_move(&mut self, action: Action) {
        self.hands[self.current_turn].remove(&action.tile);
        self.unplayed_tiles.remove(&action.tile);
        self.consecutive_passes = 0;

        if let Some((e1, e2)) = self.open_ends {
            let played_on_end = action.target_pip.unwrap();
            let other_half = if action.tile.high == played_on_end { action.tile.low } else { action.tile.high };
            
            if e1 == played_on_end {
                self.open_ends = Some((other_half, e2));
            } else {
                self.open_ends = Some((e1, other_half));
            }
        } else {
            self.open_ends = Some((action.tile.high, action.tile.low));
        }

        self.current_turn = (self.current_turn + 1) % 4;
    }
}
