mod admission;
mod dispatch;
mod enforce;
mod query;

pub(crate) use dispatch::dispatch;

use crate::network::infrastructure::header;
use crate::network::infrastructure::net::{action_fail, send_code, send_message};
use crate::network::infrastructure::relay::RelayState;
use crate::network::infrastructure::session::Session;
use std::future::Future;

pub(crate) struct ActionCtx<'a> {
    pub state: &'a RelayState,
    pub server: &'a Session,
}

impl ActionCtx<'_> {
    /// Best-effort receipt, dropped when the channel is full.
    pub fn reply_code(&self, code: u8) {
        send_code(&self.server.tx, code);
    }
    pub fn reply_message(&self, code: u8, args: &[&str]) {
        send_message(&self.server.tx, code, args);
    }
    /// Protocol-level failure receipt, only used by the dispatch failure path.
    async fn reply_fail(&self, code: u8) {
        action_fail(&self.server.tx, code).await;
    }
}

#[derive(Debug)]
pub(crate) enum ActionError {
    /// feedback to server
    Code(u8),
    /// broken internal invariant, logged only
    #[allow(dead_code, reason = "reserved for invariant violations in decode")]
    Internal(&'static str),
}

impl ActionError {
    fn code(&self) -> u8 {
        match *self {
            ActionError::Code(c) => c,
            ActionError::Internal(_) => header::INVALID_ACTION,
        }
    }
}

pub(crate) trait RelayAction: Sized {
    /// wire opcode
    const OPCODE: u8;

    fn decode(data: &[u8]) -> Result<Self, ActionError>;

    fn execute(self, ctx: &ActionCtx<'_>) -> impl Future<Output = Result<(), ActionError>> + Send;
}
