import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class MissileLockS2CPacket implements Payload {
    public static readonly ID: PayloadId<MissileLockS2CPacket> = {id: Identifier.ofVanilla('missile_lock')};
    public static readonly CODEC: PacketCodec<MissileLockS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entityId);
            writer.writeVarUInt(value.lockEntityId);
        },
        reader => {
            return new MissileLockS2CPacket(
                reader.readVarUInt(),
                reader.readVarUInt()
            )
        }
    );

    public readonly entityId: number;
    public readonly lockEntityId: number;

    public constructor(id: number, lockEntityId: number) {
        this.entityId = id;
        this.lockEntityId = lockEntityId;
    }

    public getId(): PayloadId<MissileLockS2CPacket> {
        return MissileLockS2CPacket.ID;
    }
}