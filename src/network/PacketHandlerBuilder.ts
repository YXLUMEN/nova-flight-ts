import type {Payload, PayloadId} from "./Payload.ts";
import type {Consumer} from "../apis/registry.ts";
import type {NetworkChannel} from "./NetworkChannel.ts";

export class PacketHandlerBuilder {
    private handlers: Array<[PayloadId<any>, Consumer<any>]> = [];

    public static create() {
        return new PacketHandlerBuilder();
    }

    public add<T extends Payload>(packetType: PayloadId<any>, handler: Consumer<T>): this {
        this.handlers.push([packetType, handler]);
        return this;
    }

    public register(channel: NetworkChannel, context: any): void {
        for (const [id, handler] of this.handlers) {
            channel.receive(id, handler.bind(context));
        }
    }
}