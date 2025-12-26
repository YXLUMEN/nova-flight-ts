import type {ServerChannel} from "../../../src/server/network/ServerChannel.ts";
import type {Payload} from "../../../src/network/Payload.ts";
import type {GameProfile} from "../../../src/server/entity/GameProfile.ts";
import {NodeWebSocketServer} from "./NodeWebSocketServer.ts";
import {PayloadTypeRegistry} from "../../../src/network/PayloadTypeRegistry.ts";
import {BinaryWriter} from "../../../src/nbt/BinaryWriter.ts";
import {PacketTooLargeError} from "../../../src/apis/errors.ts";
import type {Consumer, UUID} from "../../../src/apis/types.ts";
import {Session} from "./Session.ts";

export class NodeServerChannel implements ServerChannel {
    private readonly wss: NodeWebSocketServer;
    private readonly registry: PayloadTypeRegistry;

    public constructor(port: number, onRegistry?: Consumer<Session>) {
        this.wss = new NodeWebSocketServer(port, onRegistry);
        this.registry = PayloadTypeRegistry.playS2C();
    }

    private buildBuffer<T extends Payload>(payload: T) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeInt8(0x01);
        writer.writeInt8(1);
        writer.writeVarUint(type.index);
        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        if (buffer.length > NodeWebSocketServer.MAX_PACKET_SIZE) {
            throw new PacketTooLargeError(`Packet ${payload.getId().id} exceeds 6144 bytes: ${buffer.length}`);
        }

        return buffer;
    }

    public send<T extends Payload>(payload: T): void {
        const buffer = this.buildBuffer(payload);
        this.wss.broadcast(buffer);
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile): void {
        const buffer = this.buildBuffer(payload);
        this.wss.sendTo(buffer, target.clientId);
    }

    public sendToByUUID<T extends Payload>(payload: T, target: UUID): void {
        const buffer = this.buildBuffer(payload);
        this.wss.sendTo(buffer, target);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
        const uuids: UUID[] = excludes.map(profile => profile.clientId);
        if (uuids.length === this.wss.clientCount()) return;

        const buffer = this.buildBuffer(payload);
        for (const client of this.wss.clients()) {
            if (uuids.includes(client.uuid)) continue;
            client.send(buffer);
        }
    }

    public getSessionId(): number {
        return 1;
    }

    public setServerAddress(): void {
    }

    public connect(): Promise<void> {
        return Promise.resolve();
    }

    public disconnect(): void {
        this.wss.shutdown();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public isOpen(): boolean {
        return true;
    }

    public setHandler() {
    }
}