use crate::network::states::{Role, Tx};
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::Arc;
static NEXT_SESSION_ID: AtomicU16 = AtomicU16::new(1);

#[derive(Debug)]
pub struct Session {
    pub tx: Tx,
    pub role: Role,
    pub client_id: Option<[u8; 16]>,
    pub session_id: u16,
}

impl Session {
    pub fn new(tx: Tx, role: Role, client_id: Option<[u8; 16]>) -> Arc<Self> {
        Arc::new(Session {
            tx,
            role,
            client_id,
            session_id: allocate_session_id(),
        })
    }
}

fn allocate_session_id() -> u16 {
    let id = NEXT_SESSION_ID.fetch_add(1, Ordering::Relaxed);
    if id == u16::MAX {
        NEXT_SESSION_ID.store(1, Ordering::Relaxed);
        1
    } else {
        id
    }
}
