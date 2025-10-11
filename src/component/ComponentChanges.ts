import {ComponentType} from "./ComponentType.ts";

export class ComponentChanges {/*
    public static readonly PACKET_CODEC: PacketCodec<ComponentChanges> = PacketCodecUtil.of(
        (value, writer) => {
            if (value.changedComponents.size === 0) {
                writer.writeVarInt(0);
                writer.writeVarInt(0);
                return;
            }

            let i = 0;
            let j = 0;

            for (const entry of value.changedComponents.values()) {
                if (entry !== null && entry !== undefined) {
                    i++;
                } else {
                    j++;
                }
            }

            writer.writeVarInt(i);
            writer.writeVarInt(j);

            for (const entry of value.changedComponents) {
                const value = entry[1];
                if (value !== null && value !== undefined) {
                    const componentType = entry[0];
                    ComponentType.PACKET_CODEC.encode(componentType, writer);
                    componentType.packetCodec.encode(value, writer);
                }
            }
        },
        reader => {
        }
    );*/


    public readonly changedComponents = new Map<ComponentType<any>, any>();

    public constructor(changedComponents: Map<ComponentType<any>, any>) {
        this.changedComponents = changedComponents;
    }
}