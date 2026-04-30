import type {Payload} from "../../network/Payload.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {BiConsumer} from "../../type/types.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {empty} from "../../utils/uit.ts";

export class ServerIntegratedChannel implements ServerChannel {
    private readonly registry = PayloadTypeRegistry.playS2C();

    private clientSessionId: number = 2;
    private ctrl = new AbortController();
    private handler: BiConsumer<number, Payload> = empty;

    public constructor() {
        this.onMessage = this.onMessage.bind(this);
    }

    public connect(): Promise<void> {
        self.addEventListener("message", this.onMessage, {signal: this.ctrl.signal});
        return Promise.resolve();
    }

    public disconnect(): void {
        this.ctrl.abort();
        this.ctrl = new AbortController();
        this.clearHandlers();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public send<T extends Payload>(payload: T): void {
        // noinspection DuplicatedCode
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const size = payload.estimateSize?.() ?? 62;
        const writer = new BinaryWriter(size + 2);
        writer.writeVarUint(type.index);
        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        self.postMessage({
            type: 'packet',
            packet: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile): void {
        this.sendToId(payload, target.sessionId);
    }

    public sendToId<T extends Payload>(payload: T, target: number): void {
        if (target !== this.clientSessionId) return;
        this.send(payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
        if (excludes.some(p => p.sessionId === 2)) return;
        this.send(payload);
    }

    public action(): void {
    }

    private receivePacket(buf: ArrayBuffer): void {
        const reader = new BinaryReader(new Uint8Array(buf));

        const index = reader.readVarUint();
        const type = PayloadTypeRegistry.getGlobalByIndex(index);
        if (!type) return;

        const payload = type.codec.decode(reader);
        if (payload) this.handler(2, payload);
    }

    private onMessage(event: MessageEvent): void {
        const type = event.data.type;
        switch (type) {
            case 'connect': {
                self.postMessage({type: 'connect'});
                break;
            }
            case 'disconnect': {
                this.disconnect();
                break;
            }
            case 'sniff': {
                self.postMessage({type: 'sniff'});
                break;
            }
            case 'packet': {
                this.receivePacket(event.data.packet);
                break;
            }
        }
    }

    public setHandler(handler: BiConsumer<number, Payload>): void {
        this.handler = handler;
    }

    public clearHandlers(): void {
        this.handler = empty;
    }

    public getSessionId(): number {
        return 1;
    }

    public setServerAddress(): void {
    }

    public isOpen(): boolean {
        return !this.ctrl.signal.aborted;
    }
}
