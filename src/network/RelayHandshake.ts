import type {Consumer} from "../type/types.ts";
import type {NetworkSide} from "./NetworkSide.ts";
import {ISOTime} from "../utils/time.ts";
import {PacketHeader} from "./PacketHeader.ts";
import {BinaryReader} from "../serialization/BinaryReader.ts";
import {Detached} from "./packet/relay/Detached.ts";
import {Attached} from "./packet/relay/Attached.ts";
import {RelayMessage} from "./packet/relay/RelayMessage.ts";
import {RelayCodeMap} from "./RelayCodeMap.ts";
import {RelayProtocols} from "./protocol/RelayProtocols.ts";

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
            console.log(`[${this.side}] Successfully connected to "${this.ws.url}" at ${ISOTime()}`);
        };
        const connectFail = (reason: any) => {
            this.ws.close();
            clearTimeout(timeout);
            reject(reason);
        };
        timeout = setTimeout(connectFail, 6000, `[${this.side}] Connected timeout`);

        console.log(`A ${this.side} side connecting start at ${ISOTime()}`);

        this.ws.onmessage = event => this.onRelayMsg(event, connectReady, connectFail);
        this.ws.onclose = event => {
            console.warn(event.reason);
            connectFail('Server deny connect');
        }
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
        const payload = RelayProtocols.SERVER.codec.decode(reader);
        if (payload instanceof Detached) {
            fail(`[${this.side}] Ticked by relay`);
            return;
        }

        if (payload instanceof RelayMessage) {
            fail(RelayCodeMap.get(payload.code));
            return;
        }

        if (!(payload instanceof Attached)) return;

        const sessionId = payload.sessionId;
        if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > 128) {
            fail(`[${this.side}] Invalid session ID`);
            return;
        }

        success(sessionId);
    }
}