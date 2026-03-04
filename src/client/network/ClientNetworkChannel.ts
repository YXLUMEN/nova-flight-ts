import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {Consumer, UUID} from "../../apis/types.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";
import type {Payload} from "../../network/Payload.ts";

export class ClientNetworkChannel extends NetworkChannel {
    private readonly clientId: UUID;
    private handler: Consumer<Payload> = () => {
    };

    public constructor(url: string, clientId: UUID) {
        super(url, PayloadTypeRegistry.playC2S());
        this.clientId = clientId;
    }

    protected override handleMessage(event: MessageEvent) {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const payload = this.decodePayload(binary);
        if (payload) this.handler(payload);
    }

    public setHandler(handler: Consumer<Payload>) {
        this.handler = handler;
    }

    public override clearHandlers(): void {
        this.handler = () => {
        };
    }

    protected override getSide(): string {
        return 'Client';
    }

    protected override getHeader(): number {
        return 0x10;
    }

    protected override register(): void {
        const idBytes = UUIDUtil.parse(this.clientId);
        const buf = new Uint8Array(1 + idBytes.length);
        buf[0] = 0x02;
        buf.set(idBytes, 1);

        this.ws!.send(buf);
        console.log(`Client ${this.clientId} registered`);
    }
}
