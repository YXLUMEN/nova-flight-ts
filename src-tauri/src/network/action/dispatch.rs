use crate::network::action::{ActionCtx, ActionError, RelayAction, admission, enforce, query};
use crate::network::infrastructure::header;
use log::{error, warn};

/// Decode then run. Kept unboxed so a body without `await` is inlined away,
/// which is what the per-connection actions rely on.
async fn run<A: RelayAction>(data: &[u8], ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
    A::decode(data)?.execute(ctx).await
}

/// a duplicated opcode fails in the build
const fn check_unique(opcodes: &[u8]) {
    let mut i = 0;
    while i < opcodes.len() {
        let mut j = i + 1;
        while j < opcodes.len() {
            assert!(opcodes[i] != opcodes[j], "duplicate relay action opcode");
            j += 1;
        }
        i += 1;
    }
}

macro_rules! register_actions {
    ($($module:ident :: $action:ident),* $(,)?) => {
        /// Every registered opcode, in registration order.
        static OPCODES: &[u8] = &[$(<$module::$action as RelayAction>::OPCODE),*];

        const _: () = check_unique(OPCODES);

        /// `SERVER_ACTION` entry point, `data` is the payload after `[Header][Opcode]`.
        pub(crate) async fn dispatch(op: u8, data: &[u8], ctx: &ActionCtx<'_>) {
            let outcome = match op {
                $(<$module::$action as RelayAction>::OPCODE => {
                    run::<$module::$action>(data, ctx).await
                })*
                unknown => {
                    warn!("Unknown relay action: 0x{:02x}", unknown);
                    ctx.reply_fail(header::UNKNOWN_ACTION).await;
                    return;
                }
            };

            if let Err(err) = outcome {
                if let ActionError::Internal(msg) = err {
                    error!("Relay action 0x{:02x} broke invariant: {}", op, msg);
                }
                ctx.reply_fail(err.code()).await;
            }
        }
    };
}

register_actions! {
    admission::Permit,
    admission::Reject,
    admission::ActiveAck,
    admission::AcceptConn,
    query::Query,
    enforce::Kick,
    enforce::BanIp,
    enforce::UnbanIp,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Every opcode declared in `header` must be registered, otherwise the relay
    /// rejects a command the peer believes it can send.
    #[test]
    fn every_declared_opcode_is_registered() {
        for op in [
            header::KICK,
            header::PERMIT,
            header::REJECT,
            header::ACTIVE_ACK,
            header::QUERY,
            header::BAN_IP,
            header::UNBAN_IP,
        ] {
            assert!(OPCODES.contains(&op), "opcode 0x{op:02x} not registered");
        }
    }

    /// `check_unique` already guarantees this at build time, the test keeps it
    /// honest if the assertion is ever weakened.
    #[test]
    fn no_opcode_is_registered_twice() {
        let mut sorted = OPCODES.to_vec();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), OPCODES.len());
    }
}
