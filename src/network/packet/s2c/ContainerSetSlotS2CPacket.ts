import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class ContainerSetSlotS2CPacket implements Payload {
    public static readonly ID: PayloadType<ContainerSetSlotS2CPacket> = payloadType('container_set_slot');
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

    public type(): PayloadType<ContainerSetSlotS2CPacket> {
        return ContainerSetSlotS2CPacket.ID;
    }

    public accept(_listener: ClientPlayHandler): void {
    }
}