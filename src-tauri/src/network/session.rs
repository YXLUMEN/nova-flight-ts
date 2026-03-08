use crate::network::states::{RelayState, Role, Tx};
use std::collections::VecDeque;
use std::sync::{Arc, LazyLock, Mutex};
use tokio::sync::oneshot;

pub static NEXT_SESSION_ID: LazyLock<SessionAllocator> = LazyLock::new(|| SessionAllocator::new());

#[derive(Debug)]
pub struct Session {
    pub tx: Tx,
    pub role: Role,
    pub session_id: u8,
    pub uuid: Option<[u8; 16]>,
}

pub struct SessionContext {
    pub session: Arc<Session>,
    pub allow: Option<oneshot::Receiver<()>>,
    pub close: Option<oneshot::Receiver<()>>,
}

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

pub struct SessionAllocator {
    inner: Arc<Mutex<SessionAllocatorInner>>,
}

impl SessionAllocator {
    fn new() -> SessionAllocator {
        Self {
            inner: Arc::new(Mutex::new(SessionAllocatorInner::new())),
        }
    }

    pub fn allocate(&self) -> Option<u8> {
        let lock = self.inner.lock();
        if let Ok(mut allocator) = lock {
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
        } else {
            None
        }
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
    pub fn new_client(tx: Tx, session_id: u8, client_id: [u8; 16]) -> Arc<Self> {
        Arc::new(Session {
            tx,
            role: Role::Client,
            session_id,
            uuid: Some(client_id),
        })
    }

    pub fn new_server(tx: Tx, session_id: u8) -> Arc<Self> {
        Arc::new(Session {
            tx,
            role: Role::Server,
            session_id,
            uuid: None,
        })
    }

    pub fn close(&self, state: &Arc<RelayState>) {
        state.close(&self.session_id)
    }
}
