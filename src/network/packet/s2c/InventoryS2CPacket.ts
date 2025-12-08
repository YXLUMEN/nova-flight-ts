import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import type {BinaryWriter} from "../../../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../../../nbt/BinaryReader.ts";

export class InventoryS2CPacket implements Payload {
    public static readonly ID: PayloadId<InventoryS2CPacket> = {id: Identifier.ofVanilla('inventory_sync')};
    public static readonly CODEC: PacketCodec<InventoryS2CPacket> = PacketCodecs.of(this.write, this.read);

    public readonly syncId: number;
    public readonly revision: number;
    public readonly contents: Set<ItemStack>;

    public constructor(syncId: number, revision: number, contents: Set<ItemStack>) {
        this.syncId = syncId;
        this.revision = revision;
        this.contents = contents;
    }

    private static read(reader: BinaryReader) {
        return new InventoryS2CPacket(
            reader.readUint8(),
            reader.readVarUint(),
            ItemStack.LIST_PACKET_CODEC.decode(reader)
        );
    }

    private static write(writer: BinaryWriter, value: InventoryS2CPacket) {
        writer.writeInt8(value.syncId);
        writer.writeVarUint(value.revision);
        ItemStack.LIST_PACKET_CODEC.encode(writer, value.contents);
    }

    public getId(): PayloadId<any> {
        return InventoryS2CPacket.ID;
    }
}