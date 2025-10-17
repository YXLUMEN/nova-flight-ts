import {ComponentType} from "./ComponentType.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {Optional} from "../utils/Optional.ts";

export class ComponentChanges {
    public static readonly EMPTY = new ComponentChanges(new Map());

    public static readonly PACKET_CODEC: PacketCodec<ComponentChanges> = PacketCodecs.of(
        (writer, componentChanges) => {
            const components = componentChanges.changedComponents;

            if (components.size === 0) {
                writer.writeVarUInt(0);
                writer.writeVarUInt(0);
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

            writer.writeVarUInt(updateCount);
            writer.writeVarUInt(removeCount);

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
            const updateCount = reader.readVarUInt();
            const removeCount = reader.readVarUInt();

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