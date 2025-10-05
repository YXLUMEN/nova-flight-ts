import {NetworkChannel} from "../../network/NetworkChannel.ts";
import type {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {ClientReceive} from "./ClientReceive.ts";

export class ClientNetworkChannel extends NetworkChannel {
    private readonly clientId: string;

    public constructor(ws: WebSocket, registry: PayloadTypeRegistry, clientId: string) {
        super(ws, registry);
        this.clientId = clientId;
    }

    protected override getSide(): string {
        return 'client';
    }

    protected override getHeader() {
        return 0x10;
    }

    protected override register() {
        const idBytes = new TextEncoder().encode(this.clientId);
        const buf = new Uint8Array(1 + idBytes.length);
        buf[0] = 0x02;
        buf.set(idBytes, 1);
        this.ws.send(buf);
        ClientReceive.registryNetworkHandler(this);
        console.log(`Client ${this.clientId} registered`);
    }
}
