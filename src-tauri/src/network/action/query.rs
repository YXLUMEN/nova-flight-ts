use crate::network::action::{ActionCtx, ActionError, RelayAction};
use crate::network::infrastructure::header;
use crate::network::infrastructure::net::send_timeout;
use crate::network::infrastructure::protocol::QueryClientsResult;
use std::time::Duration;

/// Query every online client, no payload.
pub(crate) struct Query;

impl RelayAction for Query {
    const OPCODE: u8 = header::QUERY;

    fn decode(_data: &[u8]) -> Result<Self, ActionError> {
        Ok(Query)
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        // Reply format: [0x00][0x04][count u8]([session_id u8])*
        // Snapshot first so no guard is held across to await.
        let clients = ctx.state.iter().map(|entry| *entry.key()).collect();
        let result = QueryClientsResult { clients };
        send_timeout(&ctx.server.tx, result, Duration::from_secs(2)).await;
        Ok(())
    }
}
