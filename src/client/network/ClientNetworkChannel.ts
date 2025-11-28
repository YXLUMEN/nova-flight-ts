import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {Consumer, UUID} from "../../apis/types.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import type {Identifier} from "../../registry/Identifier.ts";

export class ClientNetworkChannel extends NetworkChannel {
    private readonly clientId: UUID;
    private readonly handlers = new HashMap<Identifier, Consumer<Payload>>();

    public constructor(url: string, clientId: UUID) {
        super(url, PayloadTypeRegistry.playC2S());
        this.clientId = clientId;
    }

    protected override handleMessage(event: MessageEvent) {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const payload = this.decodePayload(binary);
        if (!payload) return;

        this.handlers.get(payload.getId().id)?.(payload);
    }

    public override clearHandlers(): void {
        this.handlers.clear();
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

    public receive<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.handlers.set(id.id, handler as Consumer<Payload>);
    }
}
