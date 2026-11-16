import type {NetHealthManager} from "./NetHealthManager.ts";

const ERROR_TOLERANCE_TIMES = 5;
const ERROR_TOLERANCE_MS = 30_000;
const DISCONNECT_ANNOUNCE_CD = 500;
const DISCONNECT_TOLERANCE_MS = 2000;
const MAX_PACKET_PER_TICK = 36;

export class ConnectionHealth {
    public readonly manager: NetHealthManager;

    private received = 0;
    private lastActivityTime = 0;
    private disconnectStartTime = 0;
    private announceTime = 0;

    private decodeErrors = 0;
    private lastErrorTime = 0;

    public constructor(manager: NetHealthManager) {
        this.manager = manager;
    }

    public tick(): void {
        this.received = 0;
    }

    public receive(): boolean {
        this.received++;
        this.lastActivityTime = performance.now();
        return this.received >= MAX_PACKET_PER_TICK;
    }

    public announceDead(timeout: number): boolean {
        const now = performance.now();
        if (now - this.lastActivityTime >= timeout && now - this.announceTime >= DISCONNECT_ANNOUNCE_CD) {
            this.announceTime = now;
            return true;
        }
        return false;
    }

    public startDisconnect(): void {
        if (this.disconnectStartTime !== 0) return;
        this.disconnectStartTime = performance.now();
    }

    public isDead(): boolean {
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