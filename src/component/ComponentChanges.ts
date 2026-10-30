import type {Codec} from "../serialization/Codec.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Optional} from "../utils/Optional.ts";
import {DataComponentType} from "./DataComponentType.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import {Codecs} from "../serialization/Codecs.ts";
import {DataResult} from "../serialization/DataResult.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";

export class ComponentChange {
    public static readonly EMPTY: ComponentChanges = new Map();
    public static readonly CODEC: Codec<ComponentChanges> = Codecs.of(
        value => {
            const compound = new NbtCompound();
            for (const [type, optional] of value) {
                if (type.codec === null || optional.isEmpty()) continue;
                const id = Registries.DATA_COMPONENT_TYPE.getId(type);
                if (!id) continue;

                const result = type.codec.encode(optional.get()).resultOrPartial();
                if (result.isPresent()) {
                    compound.set(id.toString(), result.get());
                }
            }
            return DataResult.ok(compound);
        },
        input => {
            if (!(input instanceof NbtCompound)) {
                return DataResult.err(`Expected NbtCompound, got ${input.type()}`);
            }
            const map: ComponentChanges = new Map();
            for (const key of input.getKeys()) {
                const nbt = input.get(key);
                if (nbt === null) continue;

                const id = Identifier.tryParse(key);
                if (!id) continue;

                const entry = Registries.DATA_COMPONENT_TYPE.getEntryById(id);
                if (!entry) continue;

                const type = entry.getValue();
                if (type.codec === null) continue;

                const value = type.codec.decode(nbt).getOrNull();
                if (value === null) continue;
                map.set(type, Optional.of(value));
            }
            return DataResult.ok(map);
        }
    );

    public static readonly PACKET_CODEC: PacketCodec<ComponentChanges> = PacketCodecs.of(
        (writer, components) => {
            if (components.size === 0) {
                writer.writeVarUint(0);
                writer.writeVarUint(0);
                return;
            }

            let updateCount = 0;
            let removeCount = 0;

            for (const optional of components.values()) {
                if (optional.isPresent()) {
                    updateCount++;
                } else {
                    removeCount++;
                }
            }

            writer.writeVarUint(updateCount);
            writer.writeVarUint(removeCount);

            for (const [componentType, optional] of components) {
                if (optional.isPresent()) {
                    DataComponentType.PACKET_CODEC.encode(writer, componentType);
                    componentType.packetCodec.encode(writer, optional.get());
                }
            }

            for (const [componentType, optional] of components) {
                if (optional.isEmpty()) {
                    DataComponentType.PACKET_CODEC.encode(writer, componentType);
                }
            }
        },
        reader => {
            const updateCount = reader.readVarUint();
            const removeCount = reader.readVarUint();

            if (updateCount === 0 && removeCount === 0) {
                return ComponentChange.EMPTY;
            }

            const map: ComponentChanges = new Map();

            for (let l = 0; l < updateCount; l++) {
                const componentType = DataComponentType.PACKET_CODEC.decode(reader);
                const value = componentType.packetCodec.decode(reader);
                map.set(componentType, Optional.of(value));
            }

            for (let l = 0; l < removeCount; l++) {
                const componentType = DataComponentType.PACKET_CODEC.decode(reader);
                map.set(componentType, Optional.empty());
            }

            return map;
        }
    );
}

export type ComponentChanges = Map<DataComponentType<any>, Optional<any>>;