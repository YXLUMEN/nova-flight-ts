import type {ServerConnection} from "./ServerConnection.ts";
import type {Egress} from "./Egress.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {ConnectionHealth} from "./ConnectionHealth.ts";
import {IllegalArgumentError} from "../../type/errors.ts";
import {Log} from "../../worker/log.ts";

const ATTACH_TOO_FREQUENT_BAN = 30_000;
const ATTACH_STEP = 10_000;
const TOLERANT_INTERVAL = 500;
const TOLERANT_TIMES = 3; // <=
const MAX_TOLERANT_TIMES = 8;
const OVERLOAD_BAN = 60_000;

export class NetHealthManager {
    private readonly bus: Egress;
    private readonly cooldown: Map<string, HostCooldown> = new Map();
    private readonly banned: Map<string, BannedHost> = new Map();
    private readonly overloaded: ServerConnection[] = [];

    public constructor(bus: Egress) {
        this.bus = bus;
    }

    public overload(conn: ServerConnection) {
        this.overloaded.push(conn);
    }

    public settle(stalled: boolean, gap: number) {
        const n = this.overloaded.length;
        if (n === 0) return;
        try {
            if (stalled) {
                Log.error(`[Net] tick late by ${gap.toFixed(1)}ms, ${n} connections over budget; bans skipped`);
                return;
            }
            for (const conn of this.overloaded) {
                conn.forceDisconnect();
                this.banConn(conn, OVERLOAD_BAN);
            }
        } finally {
            this.overloaded.length = 0;
        }
    }

    public tooFrequent(host: string) {
        const now = performance.now();
        const cooldown = this.cooldown.getOrInsertComputed(host, newCd);
        const delta = now - cooldown.lastAttach;
        cooldown.lastAttach = now;

        if (delta >= TOLERANT_INTERVAL) {
            this.setForget(host, cooldown, ATTACH_TOO_FREQUENT_BAN);
            return false;
        }

        const times = cooldown.overTimes++;
        if (times <= TOLERANT_TIMES) {
            this.setForget(host, cooldown, ATTACH_TOO_FREQUENT_BAN);
            return false
        }

        if (times >= MAX_TOLERANT_TIMES) {
            clearTimeout(cooldown.forgetTimer);
            this.cooldown.delete(host);
            this.ban(host, Infinity);
            return true;
        }

        const duration = ATTACH_STEP * times;
        this.setForget(host, cooldown, duration + 2000);
        this.ban(host, duration);
        return true;
    }

    /** Ban a specified host temporary or forever */
    public ban(host: string, duration: number) {
        if (Number.isNaN(duration) || duration < 0) {
            throw new IllegalArgumentError(`Ban duration must in [0,Infinity), got "${duration}"`);
        }
        if (duration === 0) return;

        const infinite = !Number.isFinite(duration);
        if (!infinite && this.banned.size > 1024) {
            Log.warn(`Temp ban count cannot over then 1024: "${host}"`);
            return;
        }

        const now = performance.now();
        const expire = now + duration;
        const exist = this.banned.getOrInsertComputed(host, newBan);
        // 新加入的必定小于 `expire`
        if (exist.banExpire >= expire) return;

        clearTimeout(exist.banTimer);
        exist.banTimer = infinite ? undefined : setTimeout(() => {
            this.banned.delete(host);
            this.bus.action(RelayActionBuilder.unbanIp(host));
        }, duration);
        exist.banExpire = expire;

        this.bus.action(RelayActionBuilder.banIp(host));
        if (infinite) Log.warn(`Host "${host}" is banned forever`);
    }

    public banConn(conn: ServerConnection, duration: number) {
        this.ban(conn.address.host, duration);
        conn.forceDisconnect();
    }

    public create() {
        return new ConnectionHealth(this);
    }

    private setForget(host: string, cooldown: HostCooldown, duration: number) {
        clearTimeout(cooldown.forgetTimer);
        cooldown.forgetTimer = setTimeout(() => {
            this.cooldown.delete(host);
        }, duration);
    }
}

interface BannedHost {
    banExpire: number;
    banTimer: number | undefined;
}

interface HostCooldown {
    overTimes: number;
    lastAttach: number;
    forgetTimer: number | undefined;
}

function newBan(): BannedHost {
    return {banExpire: 0, banTimer: undefined};
}

function newCd(): HostCooldown {
    return {overTimes: 0, lastAttach: 0, forgetTimer: undefined};
}