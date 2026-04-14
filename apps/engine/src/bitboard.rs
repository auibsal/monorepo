use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Domino {
    pub high: u8,
    pub low: u8,
}

#[wasm_bindgen]
impl Domino {
    #[wasm_bindgen(constructor)]
    pub fn new(end1: u8, end2: u8) -> Self {
        let (high, low) = if end1 >= end2 {
            (end1, end2)
        } else {
            (end2, end1)
        };
        Domino { high, low }
    }

    pub fn to_index(&self) -> u8 {
        // (high * (high + 1)) / 2 + low
        (self.high * (self.high + 1)) / 2 + self.low
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TileSet(pub u32);

#[wasm_bindgen]
impl TileSet {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        TileSet::empty()
    }

    pub fn empty() -> Self {
        TileSet(0)
    }

    pub fn add(&mut self, domino: &Domino) {
        let index = domino.to_index();
        self.0 |= 1 << index;
    }

    pub fn remove(&mut self, domino: &Domino) {
        let index = domino.to_index();
        self.0 &= !(1 << index);
    }

    pub fn contains(&self, domino: &Domino) -> bool {
        let index = domino.to_index();
        (self.0 & (1 << index)) != 0
    }

    pub fn count(&self) -> u32 {
        self.0.count_ones()
    }
}

// The new Action Space struct representing a directional move
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Action {
    pub tile: Domino,
    pub target_pip: Option<u8>, // None if it's the very first move of the round
}
