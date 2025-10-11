import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {UUID} from "../../apis/registry.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";

export class ClientNetworkChannel extends NetworkChannel {
    private readonly clientId: UUID;

    public constructor(ws: WebSocket, clientId: UUID) {
        super(ws, PayloadTypeRegistry.playC2S());
        this.clientId = clientId;
    }

    protected override getSide(): string {
        return 'client';
    }

    protected override getHeader(): number {
        return 0x10;
    }

    protected override register(): void {
        const idBytes = UUIDUtil.parse(this.clientId);
        const buf = new Uint8Array(1 + idBytes.length);
        buf[0] = 0x02;
        buf.set(idBytes, 1);

        this.ws.send(buf);
        console.log(`Client ${this.clientId} registered`);
    }
}
