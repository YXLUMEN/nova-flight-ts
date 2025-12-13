import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {Payload} from "../../network/Payload.ts";
import type {BiConsumer, UUID} from "../../apis/types.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {IServerPlayNetwork} from "./IServerPlayNetwork.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";
import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import type {GameProfile} from "../entity/GameProfile.ts";

export class ServerNetworkChannel extends NetworkChannel implements IServerPlayNetwork {
    private readonly secretKey: Uint8Array;
    private handler: BiConsumer<number, Payload> = () => {
    };

    public constructor(address: string, secretKey: Uint8Array) {
        super(address, PayloadTypeRegistry.playS2C());
        this.secretKey = secretKey;
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeInt8(0x12);
        writer.writeInt8(this.getSessionId());
        writer.writeInt8(target.sessionId);
        this.checkAndSend(writer, type, payload);
    }

    public sendToByUUID<T extends Payload>(payload: T, target: UUID) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeInt8(0x13);
        writer.writeInt8(this.getSessionId());
        writer.writeUUID(target);
        this.checkAndSend(writer, type, payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeInt8(0x14);
        writer.writeInt8(this.getSessionId());

        writer.writeVarUint(excludes.length);
        for (const session of excludes) {
            writer.writeInt8(session.sessionId);
        }
        this.checkAndSend(writer, type, payload);
    }

    protected override handleMessage(event: MessageEvent) {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const reader = new BinaryReader(binary);

        const header = reader.readInt8();
        if (header === 0x00) {
            return this.handler(0, RelayServerPacket.CODEC.decode(reader))
        }
        if (header !== 0x10) {
            console.warn(`[${this.getSide()}] Unknown header: ${header}`);
            return null;
        }

        const sessionId = reader.readUint8();
        const index = reader.readVarUint();
        const type = PayloadTypeRegistry.getGlobalByIndex(index);
        if (!type) return null;

        const payload = type.codec.decode(reader);
        if (payload) this.handler(sessionId, payload);
    }

    public setHandler(handler: BiConsumer<number, Payload>) {
        this.handler = handler;
    }

    public override clearHandlers() {
        this.handler = () => {
        };
    }

    protected override getSide() {
        return 'Server';
    }

    protected override getHeader() {
        return 0x11;
    }

    protected register() {
        const payload = new Uint8Array(1 + this.secretKey.length);
        payload[0] = 0x01;
        payload.set(this.secretKey, 1);

        this.ws!.send(payload);
        console.log("Server registered");
    }
}