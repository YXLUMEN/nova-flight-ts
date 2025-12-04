import {ComponentType} from "./ComponentType.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Optional} from "../utils/Optional.ts";
import type {Codec} from "../serialization/Codec.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";

export class ComponentChanges {
    public static readonly EMPTY = new ComponentChanges(new Map());

    public static readonly CODEC: Codec<ComponentChanges> = {
        encode(value: ComponentChanges): NbtCompound {
            const nbt = new NbtCompound();
            if (value.changedComponents.size === 0) {
                return nbt;
            }

            for (const [type, optional] of value.changedComponents) {
                if (optional.isEmpty()) continue;
                const id = Registries.DATA_COMPONENT_TYPE.getId(type);
                if (!id) continue;
                nbt.putCompound(id.toString(), type.codec.encode(optional.get()));
            }

            return nbt;

        },
        decode(nbt: NbtCompound): ComponentChanges | null {
            const keys = nbt.getKeys();
            if (keys.size === 0) return ComponentChanges.EMPTY;

            const map = new Map<ComponentType<any>, Optional<any>>();
            for (const key of keys) {
                const id = Identifier.tryParse(key);
                if (!id) continue;
                const entry = Registries.DATA_COMPONENT_TYPE.getEntryById(id);
                if (!entry) continue;
                const nbtEntry = nbt.getCompound(key);
                if (!nbtEntry) continue;

                const type = entry.getValue();
                const compound = type.codec.decode(nbtEntry);
                map.set(type, Optional.of(compound));
            }
            return new ComponentChanges(map);
        }
    };

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
                    ComponentType.PACKET_CODEC.encode(writer, componentType);
                    componentType.packetCodec.encode(writer, optional.get());
                }
            }

            for (const [componentType, optional] of components) {
                if (optional.isEmpty()) {
                    ComponentType.PACKET_CODEC.encode(writer, componentType);
                }
            }
        },
        reader => {
            const updateCount = reader.readVarUint();
            const removeCount = reader.readVarUint();

            if (updateCount === 0 && removeCount === 0) {
                return ComponentChanges.EMPTY;
            }

            const map = new Map<ComponentType<any>, Optional<any>>();

            for (let l = 0; l < updateCount; l++) {
                const componentType = ComponentType.PACKET_CODEC.decode(reader);
                const value = componentType.packetCodec.decode(reader);
                map.set(componentType, Optional.of(value));
            }

            for (let l = 0; l < removeCount; l++) {
                const componentType = ComponentType.PACKET_CODEC.decode(reader);
                map.set(componentType, Optional.empty());
            }

            return new ComponentChanges(map);
        }
    );

    public readonly changedComponents = new Map<ComponentType<any>, Optional<any>>();

    public constructor(changedComponents: Map<ComponentType<any>, Optional<any>>) {
        this.changedComponents = changedComponents;
    }
}