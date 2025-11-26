use crate::network::states::{Role, Tx};
use std::collections::VecDeque;
use std::sync::{Arc, LazyLock, Mutex};

pub static NEXT_SESSION_ID: LazyLock<SessionAllocator> = LazyLock::new(|| SessionAllocator::new());

#[derive(Debug)]
pub struct Session {
    pub tx: Tx,
    pub role: Role,
    pub client_id: Option<[u8; 16]>,
    pub session_id: u8,
}

#[derive(Default)]
struct SessionAllocatorInner {
    free_ids: VecDeque<u8>,
    next_id: u8,
}

pub struct SessionAllocator {
    inner: Arc<Mutex<SessionAllocatorInner>>,
}

impl SessionAllocator {
    fn new() -> SessionAllocator {
        Self {
            inner: Arc::new(Mutex::new(SessionAllocatorInner::default())),
        }
    }

    pub fn allocate(&self) -> Option<u8> {
        let mut inner = self.inner.lock().unwrap();

        if let Some(id) = inner.free_ids.pop_front() {
            return Some(id);
        }

        if inner.next_id == u8::MAX {
            return None;
        }

        let id = inner.next_id;
        inner.next_id = inner.next_id.wrapping_add(1);

        if inner.next_id == 0 {
            inner.next_id = 1;
        }

        Some(id)
    }

    pub fn deallocate(&self, id: u8) {
        if id == 0 {
            return;
        }

        let mut inner = self.inner.lock().unwrap();
        inner.free_ids.push_back(id);
    }
}

impl Session {
    pub fn new(tx: Tx, role: Role, client_id: Option<[u8; 16]>, session_id: u8) -> Arc<Self> {
        Arc::new(Session {
            tx,
            role,
            client_id,
            session_id,
        })
    }
}
