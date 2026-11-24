use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::Mutex;

struct SessionAllocatorInner {
    free_ids: VecDeque<u8>,
    next_id: u8,
}

impl SessionAllocatorInner {
    fn new() -> SessionAllocatorInner {
        Self {
            free_ids: VecDeque::new(),
            next_id: 1,
        }
    }
}

pub(crate) struct SessionAllocator {
    inner: Arc<Mutex<SessionAllocatorInner>>,
}

impl SessionAllocator {
    pub fn new() -> SessionAllocator {
        Self {
            inner: Arc::new(Mutex::new(SessionAllocatorInner::new())),
        }
    }

    pub async fn allocate(&self) -> Option<u8> {
        let mut allocator = self.inner.lock().await;
        if let Some(id) = allocator.free_ids.pop_front() {
            return Some(id);
        }

        if allocator.next_id == u8::MAX {
            return None;
        }

        let id = allocator.next_id;
        allocator.next_id = allocator.next_id.wrapping_add(1);

        if allocator.next_id == 0 {
            allocator.next_id = 1;
        }

        Some(id)
    }

    pub async fn deallocate(&self, id: u8) {
        if id == 0 {
            return;
        }

        let mut inner = self.inner.lock().await;
        inner.free_ids.push_back(id);
    }
}
