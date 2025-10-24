import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/types.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerSwitchSlotC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerSwitchSlotC2SPacket> = {id: Identifier.ofVanilla('player_switch_slot')};

    public static readonly CODEC: PacketCodec<PlayerSwitchSlotC2SPacket> = PacketCodecs.of<PlayerSwitchSlotC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.uuid);
            writer.writeByte(value.slot);
        },
        (reader) => {
            return new PlayerSwitchSlotC2SPacket(reader.readUUID(), reader.readByte());
        }
    );

    public readonly uuid: UUID;
    public readonly slot: number;

    public constructor(uuid: UUID, slot: number) {
        this.uuid = uuid;
        this.slot = slot;
    }

    public getId(): PayloadId<PlayerSwitchSlotC2SPacket> {
        return PlayerSwitchSlotC2SPacket.ID;
    }
}