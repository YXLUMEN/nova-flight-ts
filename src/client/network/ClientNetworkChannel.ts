import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";

export class ClientNetworkChannel extends NetworkChannel {
    private readonly clientId: string;

    public constructor(ws: WebSocket, clientId: string) {
        super(ws, PayloadTypeRegistry.playC2S());
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
        console.log(`Client ${this.clientId} registered`);
    }
}
