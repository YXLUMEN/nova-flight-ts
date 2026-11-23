import type {UUID} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";
import type {SocketAddr} from "../../network/SocketAddr.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {ConnectionHealth} from "./ConnectionHealth.ts";
import {NetworkSide} from "../../network/NetworkSide.ts";
import {ConnectionState} from "./ConnectionState.ts";
import {Connection} from "../../network/Connection.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {Log} from "../../utils/Log.ts";

export class ServerConnection extends Connection {
    public readonly sid: number;
    public readonly uuid: UUID;
    public readonly isHost: boolean;

    private readonly health: ConnectionHealth;
    private readonly receiveQueue: RingBuffer<Payload> = new RingBuffer(32);
    private handlerDisconnected = false;

    public constructor(
        addr: SocketAddr,
        sessionId: number,
        uuid: UUID,
        isHost: boolean,
        health: ConnectionHealth,
    ) {
        super(NetworkSide.SERVER, addr);
        this.sid = sessionId;
        this.uuid = uuid;
        this.isHost = isHost;
        this.health = health;
    }

    public override tick() {
        this.health.tick();

        if (!this.packetListener) return;
        while (!this.receiveQueue.isEmpty()) {
            const payload = this.receiveQueue.shift();
            if (!payload) break;
            this.packetListener.accept(payload);
        }
        this.packetListener.tick();
    }

    public override send(payload: Payload) {
        if (this.isState(ConnectionState.CLOSED)) return;
        this.channel.send(payload);
    }

    public incoming(reader: BinaryReader) {
        if (this.health.receive()) {
            if (this.getState() <= ConnectionState.DISCONNECTING) return;
            this.disconnect('newtwork.disconnect.overload');
            this.health.manager.overload(this);
            Log.warn(`Connection "${this.sid}" at "${this.address}" reach rate limit`);
            return;
        }
        this.channel.feed(reader);
    }

    public override recv(payload: Payload) {
        this.receiveQueue.push(payload);
    }

    public override report(err: unknown) {
        if (this.health.decodeErr()) this.disconnect('network.invalid_packet');
        Log.error(`Address "${this.address}" report:\n  ${err}`);
    }

    public disconnect(reason: string, args?: string[]): void {
        if (!this.changeState(ConnectionState.DISCONNECTING)) return;
        this.health.startDisconnect();
        this.send(new PlayerDisconnectS2CPacket(this.uuid, reason, args));
    }

    public forceDisconnect(): void {
        if (!this.changeState(ConnectionState.CLOSED)) return;
        this.channel.close();
        this.channel = null!;
    }

    public handlerDisconnection(): void {
        if (this.handlerDisconnected) {
            console.warn('[Server] Connection disconnect call twice');
            return;
        }

        this.handlerDisconnected = true;
        this.packetListener?.onDisconnected();
    }

    public checkActivate(timeout: number): void {
        if (this.health.announceDead(timeout)) {
            this.disconnect('network.disconnect.timeout');
        }
    }

    public shouldRemove(): boolean {
        if (this.isState(ConnectionState.CLOSED)) return true;
        if (this.isState(ConnectionState.DISCONNECTING)) {
            return this.health.isDead();
        }
        return false;
    }

    public cleanReceived(): void {
        this.receiveQueue.clear();
    }

    public override toString(): string {
        return `[ServerConnection] SID(${this.sid}), UUID(${this.uuid}), IsLocal(${this.isHost}), State(${this.state})`;
    }
}