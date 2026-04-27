import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {Payload} from "../../network/Payload.ts";
import type {BiConsumer} from "../../type/types.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import {PacketTooLargeError} from "../../type/errors.ts";
import {RelayPackets} from "../../network/RelayPackets.ts";

export class ServerNetworkChannel extends NetworkChannel implements ServerChannel {
    private secretKey: Uint8Array | null;

    private handler: BiConsumer<number, Payload> = () => {
    };

    public constructor(address: string, secretKey: Uint8Array) {
        super(address, PayloadTypeRegistry.playS2C());
        this.secretKey = secretKey;
    }

    /**
     * 触发中继服务器操作
     * 必须由 0xFF 开头
     * */
    public action(buffer: Uint8Array<ArrayBuffer>) {
        if (!this.isOpen()) return;

        if (buffer[0] !== 0xff) {
            console.warn('Relay action packet must start with 0xFF');
            return;
        }

        if (buffer.length > NetworkChannel.MAX_PACKET_SIZE) {
            throw new PacketTooLargeError(`Action packet exceeds 6144 bytes: ${buffer.length}`);
        }

        this.ws!.send(buffer);
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile) {
        this.sendToSessionId(payload, target.sessionId);
    }

    public sendToSessionId<T extends Payload>(payload: T, target: number) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeInt8(0x12);
        // 利用协议节省R端的数据重组
        writer.writeInt8(target);
        this.checkAndSend(writer, type, payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
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

        const header = reader.readUint8();
        if (header === 0x00) {
            const index = reader.readUint8();
            const type = RelayPackets.getType(index);
            if (!type) return;
            return this.handler(0, type.codec.decode(reader));
        }
        if (header !== 0x10) {
            console.warn(`[${this.getSide()}] Unknown header: ${header}`);
            return;
        }

        const sessionId = reader.readUint8();
        const index = reader.readVarUint();
        const type = PayloadTypeRegistry.getGlobalByIndex(index);
        if (!type) return;

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
        if (!this.secretKey) throw new Error(`Cannot register without a secret key`);

        const payload = new Uint8Array(1 + this.secretKey.length);
        payload[0] = 0x01;
        payload.set(this.secretKey, 1);

        this.ws!.send(payload);
        console.log("Server registered");

        this.secretKey.fill(0);
        this.secretKey = null;
    }
}