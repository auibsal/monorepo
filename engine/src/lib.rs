pub mod bitboard;

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
