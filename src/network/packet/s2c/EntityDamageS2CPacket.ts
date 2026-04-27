import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {clamp} from "../../../utils/math/math.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class EntityDamageS2CPacket implements Payload {
    public static readonly ID: PayloadId<EntityDamageS2CPacket> = payloadId('entity_damage');
    public static readonly CODEC: PacketCodec<EntityDamageS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUint(value.entityId);
            PacketCodecs.VECTOR2D.encode(writer, value.pos);
            writer.writeUint16(value.damageUint16);
            PacketCodecs.COLOR_HEX.encode(writer, value.color);
        },
        reader => {
            return new EntityDamageS2CPacket(
                reader.readVarUint(),
                PacketCodecs.VECTOR2D.decode(reader),
                reader.readUint16(),
                PacketCodecs.COLOR_HEX.decode(reader)
            )
        }
    );

    public readonly entityId: number;
    public readonly pos: Vec2;
    private readonly damageUint16: number;
    public readonly color: string;

    public constructor(entityId: number, pos: Vec2, damageUint16: number, color: string) {
        this.entityId = entityId;
        this.pos = pos;
        this.damageUint16 = damageUint16;
        this.color = color;
    }

    public static create(entityId: number, pos: Vec2, damage: number, color: string = '#ff3434'): EntityDamageS2CPacket {
        return new EntityDamageS2CPacket(
            entityId,
            pos,
            clamp((damage * 10) | 0, 0, 65535),
            color
        );
    }

    public getId(): PayloadId<any> {
        return EntityDamageS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onEntityDamage(this);
    }

    public get damage() {
        return this.damageUint16 / 10;
    }
}