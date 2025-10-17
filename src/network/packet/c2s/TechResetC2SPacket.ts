import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/registry.ts";

export class TechResetC2SPacket implements Payload {
    public static readonly ID: PayloadId<TechResetC2SPacket> = {id: Identifier.ofVanilla('reset_tech')};

    public static readonly CODEC: PacketCodec<TechResetC2SPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeUUID(value.uuid);
        },
        reader => new TechResetC2SPacket(reader.readUUID())
    );

    public readonly uuid: UUID;

    public constructor(uuid: UUID) {
        this.uuid = uuid;
    }

    public getId(): PayloadId<TechResetC2SPacket> {
        return TechResetC2SPacket.ID;
    }
}