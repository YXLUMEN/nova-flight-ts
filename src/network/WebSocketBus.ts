import {PacketTooLargeError} from "../type/errors.ts";
import {RelayHandshake} from "./RelayHandshake.ts";
import {Log} from "../worker/log.ts";
import type {NetworkSide} from "./NetworkSide.ts";
import {sleep} from "../utils/util.ts";
import {isDev} from "../configs/RuntimeConfig.ts";

export abstract class WebSocketBus {
    public static readonly MAX_PACKET_SIZE = 6144;
    public static readonly MAX_ESTIMATE = this.MAX_PACKET_SIZE - 16;

    private readonly side: NetworkSide;
    private address: string;
    private ws: WebSocket | null = null;
    private sessionId: number = 0;

    protected constructor(side: NetworkSide, address: string) {
        this.side = side;
        this.address = address;
    }

    protected send(buf: Uint8Array<ArrayBuffer>): void {
        if (buf.length <= WebSocketBus.MAX_PACKET_SIZE) {
            this.ws!.send(buf);
            return;
        }

        const err = new PacketTooLargeError(buf.length, WebSocketBus.MAX_PACKET_SIZE);
        if (isDev) throw err;
        Log.warn(err);
    }

    public async connect(): Promise<void> {
        if (this.isConnected()) return;

        this.ws = new WebSocket(`ws://${this.address}`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => this.register();

        const handShake = new RelayHandshake(this.ws, this.side);
        this.sessionId = await handShake.alloc();

        this.ws.onmessage = this.messageEvent.bind(this);
        this.ws.onclose = event => {
            Log.info(`[${this.side}] Connection to ${this.address} closed because ${event.type}:${event.reason || 'unknown'}`);
        }
        this.ws.onerror = event =>
            Log.error(`[${this.side}] Connection Error: ${event.type}:${event.target}`);
    }

    protected abstract register(): void;

    protected abstract messageEvent(event: MessageEvent): void;

    public disconnect(): void {
        this.ws?.close(1000, 'Connection Closed');
        this.ws = null;
    }

    public setRemote(addr: string) {
        this.address = addr;
    }

    public getSessionId() {
        return this.sessionId;
    }

    public isConnected(): boolean {
        return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
    }

    public async sniff(
        retryDelay: number = 2000,
        maxRetries: number = 5,
        onTry?: (attempts: number, maxRetries: number) => boolean
    ): Promise<boolean> {
        const addr = `ws://${this.address}`;

        for (let attempts = 0; attempts < maxRetries; attempts++) {
            const {promise: ok, resolve} = Promise.withResolvers<boolean>();
            const test = new WebSocket(addr);

            test.onopen = () => {
                console.log("Server reachable");
                test.close();
                resolve(true);
            };

            test.onerror = () => {
                console.warn(`Server not reachable (attempt ${attempts + 1}/${maxRetries})`);
                test.close();
                resolve(false);
            };

            if (await ok) return true;

            if (onTry?.(attempts, maxRetries)) {
                break;
            }
            if (attempts < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }

        return false;
    }
}