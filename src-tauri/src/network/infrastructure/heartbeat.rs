use std::time::Duration;
use tokio::time::{Instant, Interval, MissedTickBehavior, interval};
use tokio_tungstenite::tungstenite::{Bytes, Message};

const PING_INTERVAL: Duration = Duration::from_secs(20);
const IDLE_TIMEOUT: Duration = Duration::from_secs(50);
const _: () = assert!(IDLE_TIMEOUT.as_secs() >= PING_INTERVAL.as_secs() * 2);

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum HeartBeat {
    Fresh,
    Break,
}

pub(crate) struct Pinger {
    ticker: Interval,
}

impl Pinger {
    pub(crate) fn new() -> Self {
        Self::with_interval(PING_INTERVAL)
    }

    pub(crate) fn with_interval(period: Duration) -> Self {
        let mut ticker = interval(period);
        ticker.set_missed_tick_behavior(MissedTickBehavior::Delay);
        ticker.reset();
        Self { ticker }
    }

    pub(crate) async fn next(&mut self) -> Message {
        self.ticker.tick().await;
        Message::Ping(Bytes::new())
    }
}

pub(crate) struct IdleWatch {
    timeout: Duration,
    min_remaining: Duration,
    last: Instant,
}

impl IdleWatch {
    pub(crate) fn new() -> Self {
        Self::with_timeout(IDLE_TIMEOUT)
    }

    pub(crate) fn with_timeout(timeout: Duration) -> Self {
        Self {
            timeout,
            min_remaining: timeout.div_f32(2.0),
            last: Instant::now(),
        }
    }

    pub(crate) fn deadline(&self) -> Instant {
        self.last + self.timeout
    }

    /// Half timeout cycle refresh
    pub(crate) fn should_reset(&mut self, beat: HeartBeat) -> Option<Instant> {
        let HeartBeat::Fresh = beat else {
            return None;
        };

        let now = Instant::now();
        if now.saturating_duration_since(self.last) >= self.min_remaining {
            self.last = now;
            Some(self.deadline())
        } else {
            None
        }
    }
}
