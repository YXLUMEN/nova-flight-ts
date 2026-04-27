import type {Payload} from "../../network/Payload.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {BiConsumer} from "../../type/types.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";

export class ServerIntegratedChannel implements ServerChannel {
    private readonly registry = PayloadTypeRegistry.playS2C();

    private open = false;
    private handler: BiConsumer<number, Payload> = () => {
    };

    public connect(): Promise<void> {
        this.open = true;
        return Promise.resolve();
    }

    public disconnect(): void {
        this.open = false;
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public send<T extends Payload>(payload: T): void {
        if (!this.open) return;

        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeVarUint(type.index);
        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        self.postMessage({
            type: 'packet',
            packet: buffer
        }, {transfer: [buffer.buffer]});
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile): void {
        this.sendToSessionId(payload, target.sessionId);
    }

    public sendToSessionId<T extends Payload>(payload: T, target: number): void {
        if (target !== 2) return;
        this.send(payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
        if (excludes.some(p => p.sessionId === 2)) return;
        this.send(payload);
    }

    public action(): void {
    }

    public receivePacket(buf: Uint8Array<ArrayBuffer>): void {
        const reader = new BinaryReader(buf);

        const index = reader.readVarUint();
        const type = PayloadTypeRegistry.getGlobalByIndex(index);
        if (!type) return;

        const payload = type.codec.decode(reader);
        if (payload) this.handler(2, payload);
    }

    public setHandler(handler: BiConsumer<number, Payload>): void {
        this.handler = handler;
    }

    public getSessionId(): number {
        return 1;
    }

    public setServerAddress(): void {
    }

    public isOpen(): boolean {
        return this.open;
    }
}
