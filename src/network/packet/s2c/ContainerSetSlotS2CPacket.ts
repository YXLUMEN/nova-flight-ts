import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";

export class ContainerSetSlotS2CPacket implements Payload {
    public static readonly ID: PayloadId<ContainerSetSlotS2CPacket> = payloadId('container_set_slot');
    public static readonly CODEC: PacketCodec<ContainerSetSlotS2CPacket> = PacketCodecs.of(this.write, this.read);

    public readonly syncId: number;
    public readonly revision: number;
    public readonly slot: number;
    public readonly stack: ItemStack;

    public constructor(syncId: number, revision: number, slot: number, stack: ItemStack) {
        this.syncId = syncId;
        this.revision = revision;
        this.slot = slot;
        this.stack = stack;
    }

    private static write(writer: BinaryWriter, value: ContainerSetSlotS2CPacket) {
        writer.writeVarUint(value.syncId);
        writer.writeVarUint(value.revision);
        writer.writeInt8(value.slot);
        ItemStack.PACKET_CODEC.encode(writer, value.stack);
    }

    private static read(reader: BinaryReader): ContainerSetSlotS2CPacket {
        return new ContainerSetSlotS2CPacket(
            reader.readVarUint(),
            reader.readVarUint(),
            reader.readUint8(),
            ItemStack.PACKET_CODEC.decode(reader)
        );
    }

    public getId(): PayloadId<ContainerSetSlotS2CPacket> {
        return ContainerSetSlotS2CPacket.ID;
    }
}