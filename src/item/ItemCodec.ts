import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import type {BinaryWriter} from "../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../serialization/BinaryReader.ts";
import type {Codec} from "../serialization/Codec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Codecs} from "../serialization/Codecs.ts";
import {ComponentChange} from "../component/ComponentChanges.ts";
import {Optional} from "../utils/Optional.ts";
import {PatchComponentMap} from "../component/PatchComponentMap.ts";
import {Registries} from "../registry/Registries.ts";
import {ItemStack} from "./ItemStack.ts";

export class ItemCodec {
    public static readonly ITEM_VALUE_PACKET_CODEC = PacketCodecs.registryValue(Registries.ITEM);
    public static readonly ITEM_PACKET_CODEC = PacketCodecs.registryEntry(Registries.ITEM);
    public static readonly PACKET_CODEC: PacketCodec<ItemStack> = PacketCodecs.of(
        (writer: BinaryWriter, itemStack: ItemStack): void => {
            if (itemStack.isEmpty()) {
                writer.writeVarUint(0);
                return;
            }
            writer.writeVarUint(itemStack.getCount());
            ItemCodec.ITEM_PACKET_CODEC.encode(writer, itemStack.getRegistryEntry());
            ComponentChange.PACKET_CODEC.encode(writer, itemStack.getComponents().getChanges());
        },
        (reader: BinaryReader): ItemStack => {
            const count = reader.readVarUint();
            if (count <= 0) return ItemStack.EMPTY;

            const item = ItemCodec.ITEM_PACKET_CODEC.decode(reader).getValue();
            const componentChanges = ComponentChange.PACKET_CODEC.decode(reader);
            return new ItemStack(item, count, PatchComponentMap.create(item.getComponents(), componentChanges));
        }
    );
    public static readonly LIST_PACKET_CODEC = PacketCodecs.setOf(this.PACKET_CODEC);

    public static readonly CODEC: Codec<ItemStack> = Codecs.group<ItemStack>(
        Codecs.field('type', Codecs.registry(Registries.ITEM)).for(v => v.getItem().getRegistryEntry()),
        Codecs.field('counts', Codecs.INT8).for(v => v.getCount()),
        Codecs.optionalField('compounds', ComponentChange.CODEC).for(v =>
            v.isEmpty() ? Optional.empty() : Optional.of(v.getComponents().getChanges())),
    ).apply((v1, v2, v3) => new ItemStack(v1.getValue(), v2, v3.isPresent() ? v3.get() : null));
}