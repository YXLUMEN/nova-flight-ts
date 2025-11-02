use crate::network::states::{Role, Tx};
use std::sync::Arc;

#[derive(Debug)]
pub struct Session {
    pub tx: Tx,
    pub role: Role,
    pub client_id: Option<[u8; 16]>,
}

impl Session {
    pub fn new(tx: Tx, role: Role, client_id: Option<[u8; 16]>) -> Arc<Self> {
        Arc::new(Session {
            tx,
            role,
            client_id,
        })
    }
}
