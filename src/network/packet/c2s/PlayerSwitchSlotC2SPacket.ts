import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {UUID} from "../../../apis/registry.ts";

export class PlayerSwitchSlotC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerSwitchSlotC2SPacket> = {id: Identifier.ofVanilla('player_switch_slot')};

    public static readonly CODEC: PacketCodec<PlayerSwitchSlotC2SPacket> = PacketCodec.of<PlayerSwitchSlotC2SPacket>(
        (value, writer) => {
            writer.writeUUID(value.uuid);
            writer.writeInt8(value.slot);
        },
        (reader) => {
            return new PlayerSwitchSlotC2SPacket(reader.readUUID(), reader.readInt8());
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