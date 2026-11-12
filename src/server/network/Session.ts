import {RateLimitError} from "../../type/errors.ts";

const ERROR_TOLERANCE_TIMES = 5;
const ERROR_TOLERANCE_MS = 30_000;
const DISCONNECT_ANNOUNCE_CD = 500;
const DISCONNECT_TOLERANCE_MS = 2000;
const MAX_PACKET_PER_TICK = 36;

export class Session {
    private received = 0;

    private lastActivityTime = 0;
    private disconnectStartTime = 0;
    private announceTime = 0;

    private decodeErrors = 0;
    private lastErrorTime = 0;

    public tick() {
        if (this.received >= MAX_PACKET_PER_TICK) {
            throw new RateLimitError(MAX_PACKET_PER_TICK);
        }
        this.received = 0;
    }

    public active() {
        this.received++;
        this.lastActivityTime = performance.now();
    }

    public announceDead(timeout: number) {
        const now = performance.now();
        if (now - this.lastActivityTime >= timeout && now - this.announceTime >= DISCONNECT_ANNOUNCE_CD) {
            this.announceTime = now;
            return true;
        }
        return false;
    }

    public startDisconnect() {
        if (this.disconnectStartTime !== 0) return;
        this.disconnectStartTime = performance.now();
    }

    public isDead() {
        return (performance.now() - this.disconnectStartTime) > DISCONNECT_TOLERANCE_MS;
    }

    public decodeErr(): boolean {
        let errors = this.decodeErrors;
        const last = this.lastErrorTime;
        const now = performance.now();
        if (now - last > ERROR_TOLERANCE_MS) errors = 0;

        errors++;
        this.decodeErrors = errors;
        this.lastErrorTime = now;
        return errors > ERROR_TOLERANCE_TIMES;
    }
}