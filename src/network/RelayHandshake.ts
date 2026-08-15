import {ISOTime} from "../utils/time.ts";
import type {Consumer} from "../type/types.ts";
import {PacketHeader} from "./PacketHeader.ts";
import {BinaryReader} from "../serialization/BinaryReader.ts";
import {CodecRegistry} from "./CodecRegistry.ts";
import {Detached} from "./packet/relay/Detached.ts";
import {Attached} from "./packet/relay/Attached.ts";
import type {NetworkSide} from "./NetworkSide.ts";

export class RelayHandshake {
    private readonly ws: WebSocket;
    private readonly side: NetworkSide;

    public constructor(ws: WebSocket, side: NetworkSide) {
        this.ws = ws;
        this.side = side;
    }

    public alloc(): Promise<number> {
        const {promise, resolve, reject} = Promise.withResolvers<number>();

        let timeout: number;
        const connectReady = (id: number) => {
            clearTimeout(timeout);
            resolve(id);
            console.log(`[${this.side}] Successfully connected to ${this.ws.url} at ${ISOTime()}`);
        };
        const connectFail = (reason: any) => {
            this.ws?.close();
            clearTimeout(timeout);
            reject(reason);
        };
        timeout = setTimeout(connectFail, 6000, `[${this.side}] Connected timeout`);

        console.log(`A ${this.side} side connecting start at ${ISOTime()}`);

        this.ws.onmessage = event => this.onRelayMsg(event, connectReady, connectFail);
        this.ws.onerror = event => {
            const msg = `[${this.side}] Connection Error: ${event.type}:${event.target}`;
            console.error(msg);
            connectFail(msg);
        }

        return promise;
    }

    private onRelayMsg(event: MessageEvent, success: Consumer<number>, fail: Consumer<any>): void {
        const binary = event.data as ArrayBuffer;
        const buf = new Uint8Array(binary);
        if (buf[0] !== PacketHeader.RELAY) return;

        const reader = new BinaryReader(buf);
        reader.readUint8();
        const index = reader.readUint8();
        const codec = CodecRegistry.byId(index);
        if (!codec) return;

        const packet = codec.codec.decode(reader);
        if (packet instanceof Detached) {
            fail(`[${this.side}] Ticked by relay`);
            return;
        }

        if (!(packet instanceof Attached)) return;

        const sessionId = packet.sessionId;
        if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > 64) {
            fail(`[${this.side}] Invalid session ID`);
            return;
        }

        success(sessionId);
    }
}