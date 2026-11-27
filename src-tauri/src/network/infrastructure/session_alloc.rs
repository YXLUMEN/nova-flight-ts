use std::sync::atomic::{AtomicU64, Ordering};

const WORDS: usize = 4;
const _: () = assert!(
    WORDS * 64 == 256,
    "The bitmap must exactly cover all the values of u8"
);

// reserved 0 and 255
const RESERVED_ZERO: u8 = 0;
const RESERVED_HIGH: u8 = u8::MAX;

pub(crate) struct SessionAllocator {
    bits: [AtomicU64; WORDS],
}

impl SessionAllocator {
    pub(crate) fn new() -> SessionAllocator {
        let mut bits = [const { AtomicU64::new(0) }; WORDS];
        bits[0] = AtomicU64::new(1u64 << RESERVED_ZERO);
        let hi = RESERVED_HIGH as usize;
        bits[hi / 64] = AtomicU64::new(1u64 << (hi % 64));
        SessionAllocator { bits }
    }

    pub(crate) fn alloc(&self) -> Option<u8> {
        for (word_index, word) in self.bits.iter().enumerate() {
            let mut cur = word.load(Ordering::Relaxed);
            loop {
                // This word is full, move on to the next one.
                // This early exit also ensures that `trailing_ones()` below is less than 64,
                // Otherwise, `1u64 << 64` will panic.
                if cur == u64::MAX {
                    break;
                }

                let bit = cur.trailing_ones();
                debug_assert!(bit < 64);

                match word.compare_exchange_weak(
                    cur,
                    cur | (1u64 << bit),
                    Ordering::AcqRel,
                    Ordering::Relaxed,
                ) {
                    Ok(_) => {
                        let id = (word_index * 64) as u8 + bit as u8;
                        debug_assert!(id != RESERVED_ZERO && id != RESERVED_HIGH);
                        return Some(id);
                    }
                    // taken away by another thread
                    Err(now) => cur = now,
                }
            }
        }
        None
    }

    pub(crate) fn dealloc(&self, id: u8) {
        // 0 never alloc, the bit of 255 is always 1, dealloc them will make them can alloc.
        if id == RESERVED_ZERO || id == RESERVED_HIGH {
            return;
        }
        let mask = 1u64 << (id % 64);
        self.bits[(id / 64) as usize].fetch_and(!mask, Ordering::AcqRel);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;
    use std::sync::Arc;

    #[test]
    fn starts_at_one() {
        let alloc = SessionAllocator::new();
        assert_eq!(alloc.alloc(), Some(1));
        assert_eq!(alloc.alloc(), Some(2));
        assert_eq!(alloc.alloc(), Some(3));
    }

    #[test]
    fn exhausts_at_254_without_handing_out_reserved() {
        let alloc = SessionAllocator::new();
        let ids: Vec<u8> = std::iter::from_fn(|| alloc.alloc()).collect();

        assert_eq!(ids.len(), 254);
        assert_eq!(ids.first(), Some(&1));
        assert_eq!(ids.last(), Some(&254));
        assert!(!ids.contains(&RESERVED_ZERO));
        assert!(!ids.contains(&RESERVED_HIGH));
        assert_eq!(alloc.alloc(), None);
    }

    #[test]
    fn prefers_lowest_free() {
        let alloc = SessionAllocator::new();
        for _ in 0..5 {
            let _ = alloc.alloc();
        }
        alloc.dealloc(3);
        assert_eq!(alloc.alloc(), Some(3));

        alloc.dealloc(1);
        alloc.dealloc(5);
        assert_eq!(alloc.alloc(), Some(1));
        assert_eq!(alloc.alloc(), Some(5));
    }

    #[test]
    fn dealloc_is_idempotent() {
        let alloc = SessionAllocator::new();
        let id = alloc.alloc().unwrap();
        alloc.dealloc(id);
        alloc.dealloc(id); // must be harmless
        assert_eq!(alloc.alloc(), Some(id));
        assert_eq!(alloc.alloc(), Some(2), "Not sending the same SID twice");
    }

    #[test]
    fn dealloc_of_reserved_is_noop() {
        let alloc = SessionAllocator::new();
        alloc.dealloc(RESERVED_ZERO);
        alloc.dealloc(RESERVED_HIGH);

        let ids: Vec<u8> = std::iter::from_fn(|| alloc.alloc()).collect();
        assert_eq!(ids.len(), 254, "Reserved space is still unallocated");
    }

    #[test]
    fn refill_after_full() {
        let alloc = SessionAllocator::new();
        let _: Vec<u8> = std::iter::from_fn(|| alloc.alloc()).collect();
        assert_eq!(alloc.alloc(), None);

        alloc.dealloc(200);
        assert_eq!(alloc.alloc(), Some(200));
        assert_eq!(alloc.alloc(), None);
    }

    #[test]
    fn concurrent_allocs_are_unique() {
        let alloc = Arc::new(SessionAllocator::new());
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let alloc = Arc::clone(&alloc);
                std::thread::spawn(move || {
                    let mut out = Vec::new();
                    while let Some(id) = alloc.alloc() {
                        out.push(id);
                    }
                    out
                })
            })
            .collect();

        let mut all = Vec::new();
        for handle in handles {
            all.extend(handle.join().unwrap());
        }

        let unique: HashSet<u8> = all.iter().copied().collect();
        assert_eq!(all.len(), 254);
        assert_eq!(unique.len(), all.len(), "duplicate SID");
    }
}
