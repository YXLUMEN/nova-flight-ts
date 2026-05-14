import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {WorldEvent} from "../../../world/events/WorldEvent.ts";
import {WorldEventType} from "../../../world/events/WorldEventType.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class SpawnWorldEventS2CPacket implements Payload {
    public static readonly ID: PayloadType<SpawnWorldEventS2CPacket> = payloadType('spawn_world_event');
    public static readonly CODEC: PacketCodec<SpawnWorldEventS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            const type = value.event.getType();
            WorldEventType.PACKET_CODEC.encode(writer, type);
            type.codec.encode(writer, value.event);
        },
        reader => {
            const type = WorldEventType.PACKET_CODEC.decode(reader);
            const event = type.codec.decode(reader);
            return new SpawnWorldEventS2CPacket(event);
        }
    );

    public readonly event: WorldEvent;

    public constructor(event: WorldEvent) {
        this.event = event;
    }

    public type(): PayloadType<SpawnWorldEventS2CPacket> {
        return SpawnWorldEventS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}