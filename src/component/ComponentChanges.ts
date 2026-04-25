import {DataComponentType} from "./DataComponentType.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Optional} from "../utils/Optional.ts";
import type {Codec} from "../serialization/Codec.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import {Codecs} from "../serialization/Codecs.ts";

export class ComponentChanges {
    public static readonly EMPTY = new ComponentChanges(new Map());
    public static readonly CODEC: Codec<ComponentChanges> = Codecs.of(
        value => {
            const compound = new NbtCompound();
            if (value.changedComponents.size === 0) {
                return compound;
            }

            for (const [type, optional] of value.changedComponents) {
                if (optional.isEmpty()) continue;
                const id = Registries.DATA_COMPONENT_TYPE.getId(type);
                if (!id) continue;

                compound.set(id.toString(), type.codec.encode(optional.get()));
            }

            return compound;
        },
        input => {
            const keys = input.getKeys();
            if (keys.size === 0) return ComponentChanges.EMPTY;

            const map = new Map<DataComponentType<any>, Optional<any>>();
            for (const key of keys) {
                const nbt = input.get(key);
                if (!nbt) continue;

                const id = Identifier.tryParse(key);
                if (!id) continue;

                const entry = Registries.DATA_COMPONENT_TYPE.getEntryById(id);
                if (!entry) continue;

                const type = entry.getValue();
                const compound = type.codec.decode(nbt);
                map.set(type, Optional.of(compound));
            }
            return new ComponentChanges(map);
        }
    );

    public static readonly PACKET_CODEC: PacketCodec<ComponentChanges> = PacketCodecs.of(
        (writer, componentChanges) => {
            const components = componentChanges.changedComponents;

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
                return ComponentChanges.EMPTY;
            }

            const map = new Map<DataComponentType<any>, Optional<any>>();

            for (let l = 0; l < updateCount; l++) {
                const componentType = DataComponentType.PACKET_CODEC.decode(reader);
                const value = componentType.packetCodec.decode(reader);
                map.set(componentType, Optional.of(value));
            }

            for (let l = 0; l < removeCount; l++) {
                const componentType = DataComponentType.PACKET_CODEC.decode(reader);
                map.set(componentType, Optional.empty());
            }

            return new ComponentChanges(map);
        }
    );

    public readonly changedComponents = new Map<DataComponentType<any>, Optional<any>>();

    public constructor(changedComponents: Map<DataComponentType<any>, Optional<any>>) {
        this.changedComponents = changedComponents;
    }
}