use crate::network::action::{ActionCtx, ActionError, RelayAction};
use crate::network::infrastructure::header;

/// `[Token u32 LE]`
fn read_token(data: &[u8]) -> Result<u32, ActionError> {
    if data.len() != 4 {
        return Err(ActionError::Code(header::INVALID_TOKEN));
    }
    let b: &[u8] = &data[0..4];
    let token = u32::from_le_bytes(b.try_into().unwrap());
    Ok(token)
}

/// Allow a pending client to upgrade.
pub(crate) struct Permit {
    token: u32,
}

impl RelayAction for Permit {
    const OPCODE: u8 = header::PERMIT;

    fn decode(data: &[u8]) -> Result<Self, ActionError> {
        Ok(Permit {
            token: read_token(data)?,
        })
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        ctx.state.permit(self.token);
        Ok(())
    }
}

/// Reject a pending client.
pub(crate) struct Reject {
    token: u32,
}

impl RelayAction for Reject {
    const OPCODE: u8 = header::REJECT;

    fn decode(data: &[u8]) -> Result<Self, ActionError> {
        Ok(Reject {
            token: read_token(data)?,
        })
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        ctx.state.reject(self.token);
        Ok(())
    }
}

/// Server acknowledged an active client, promote it.
pub(crate) struct ActiveAck {
    sid: u8,
    token: u32,
}

impl RelayAction for ActiveAck {
    const OPCODE: u8 = header::ACTIVE_ACK;

    fn decode(data: &[u8]) -> Result<Self, ActionError> {
        if data.len() != 5 {
            return Err(ActionError::Code(header::INVALID_ACTION));
        }
        let sid = data[0];
        let token = read_token(&data[1..])?;
        Ok(ActiveAck { sid, token })
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        ctx.state.active(self.sid, self.token);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The reference flow touches these twice per connection, so the byte
    /// layout is pinned here.
    #[test]
    fn permit_reads_token_little_endian() {
        let Permit { token } = Permit::decode(&[0x01, 0x02, 0x03, 0x04]).unwrap();
        assert_eq!(token, 0x0403_0201);
    }

    #[test]
    fn token_must_be_exactly_four_bytes() {
        for bad in [&[][..], &[1][..], &[1, 2, 3][..], &[1, 2, 3, 4, 5][..]] {
            assert!(matches!(
                Permit::decode(bad),
                Err(ActionError::Code(header::INVALID_TOKEN))
            ));
            assert!(matches!(
                Reject::decode(bad),
                Err(ActionError::Code(header::INVALID_TOKEN))
            ));
        }
    }

    #[test]
    fn active_ack_reads_sid_then_token() {
        let ActiveAck { sid, token } = ActiveAck::decode(&[7, 0x01, 0x02, 0x03, 0x04]).unwrap();
        assert_eq!(sid, 7);
        assert_eq!(token, 0x0403_0201);
    }

    #[test]
    fn active_ack_must_be_exactly_five_bytes() {
        for bad in [
            &[][..],
            &[7][..],
            &[7, 1, 2, 3][..],
            &[7, 1, 2, 3, 4, 5][..],
        ] {
            assert!(matches!(
                ActiveAck::decode(bad),
                Err(ActionError::Code(header::INVALID_ACTION))
            ));
        }
    }
}
