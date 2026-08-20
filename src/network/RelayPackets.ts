import type {Payload} from "./Payload.ts";
import type {PacketCodec} from "./codec/PacketCodec.ts";
import {CodecRegistry} from "./CodecRegistry.ts";
import {Attached} from "./packet/relay/Attached.ts";
import {Detached} from "./packet/relay/Detached.ts";
import {ClientAttached} from "./packet/relay/ClientAttached.ts";
import {RelayMessage} from "./packet/relay/RelayMessage.ts";
import type {PayloadType} from "./PayloadType.ts";
import {Query} from "./packet/relay/Query.ts";

export class RelayPackets {
    public static registerNetworkPacket(): void {
        this.register(Detached.ID, Detached.CODEC);
        this.register(Attached.ID, Attached.CODEC);
        this.register(ClientAttached.ID, ClientAttached.CODEC);
        this.register(RelayMessage.ID, RelayMessage.CODEC);
        this.register(Query.ID, Query.CODEC);
    }

    private static register<T extends Payload>(type: PayloadType<T>, codec: PacketCodec<T>): void {
        CodecRegistry.RELAY.register(type, codec)
    }
}