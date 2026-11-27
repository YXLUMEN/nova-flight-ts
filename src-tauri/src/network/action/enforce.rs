use crate::network::action::{ActionCtx, ActionError, RelayAction};
use crate::network::infrastructure::header;
use crate::network::infrastructure::util::read_ipv4;
use std::net::Ipv4Addr;

/// Kick an active client by its sid.
pub(crate) struct Kick {
    sid: u8,
}

impl RelayAction for Kick {
    const OPCODE: u8 = header::KICK;

    fn decode(data: &[u8]) -> Result<Self, ActionError> {
        match data {
            [sid] => Ok(Kick { sid: *sid }),
            _ => Err(ActionError::Code(header::EMPTY_SID)),
        }
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        if let Some(mut client) = ctx.state.get_mut(self.sid) {
            ctx.reply_code(header::KICKED);
            client.close();
        }
        Ok(())
    }
}

/// Ban an address, `[Ipv4 4B]`.
pub(crate) struct BanIp {
    ip: Ipv4Addr,
}

impl RelayAction for BanIp {
    const OPCODE: u8 = header::BAN_IP;

    fn decode(data: &[u8]) -> Result<Self, ActionError> {
        read_ipv4(data)
            .map(|ip| BanIp { ip })
            .ok_or(ActionError::Code(header::INVALID_IPV4))
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        ctx.state.ban(self.ip.into()).await;
        let addr = self.ip.to_string();
        ctx.reply_message(header::BANED, &[&addr]);
        Ok(())
    }
}

/// Lift a ban, `[Ipv4 4B]`.
pub(crate) struct UnbanIp {
    ip: Ipv4Addr,
}

impl RelayAction for UnbanIp {
    const OPCODE: u8 = header::UNBAN_IP;

    fn decode(data: &[u8]) -> Result<Self, ActionError> {
        read_ipv4(data)
            .map(|ip| UnbanIp { ip })
            .ok_or(ActionError::Code(header::INVALID_IPV4))
    }

    async fn execute(self, ctx: &ActionCtx<'_>) -> Result<(), ActionError> {
        if ctx.state.unban(&self.ip.into()).await {
            let addr = self.ip.to_string();
            ctx.reply_message(header::UNBAN, &[&addr]);
        } else {
            ctx.reply_code(header::DID_NOT_BANED);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kick_requires_exactly_one_sid() {
        assert!(Kick::decode(&[3]).is_ok());
        for bad in [&[][..], &[1, 2][..]] {
            assert!(matches!(
                Kick::decode(bad),
                Err(ActionError::Code(header::EMPTY_SID))
            ));
        }
    }

    #[test]
    fn ipv4_is_read_back_as_little_endian_bytes() {
        let BanIp { ip } = BanIp::decode(&[1, 2, 3, 4]).unwrap();
        assert_eq!(ip, Ipv4Addr::new(1, 2, 3, 4));

        let UnbanIp { ip } = UnbanIp::decode(&[1, 2, 3, 4]).unwrap();
        assert_eq!(ip, Ipv4Addr::new(1, 2, 3, 4));
    }

    #[test]
    fn short_ipv4_is_rejected() {
        for bad in [&[][..], &[1][..], &[1, 2, 3][..]] {
            assert!(matches!(
                BanIp::decode(bad),
                Err(ActionError::Code(header::INVALID_IPV4))
            ));
            assert!(matches!(
                UnbanIp::decode(bad),
                Err(ActionError::Code(header::INVALID_IPV4))
            ));
        }
    }
}
