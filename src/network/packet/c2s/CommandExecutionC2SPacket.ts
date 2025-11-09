import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";

export class CommandExecutionC2SPacket implements Payload {
    public static readonly ID: PayloadId<CommandExecutionC2SPacket> = {id: Identifier.ofVanilla('command_exec')};

    public static readonly CODEC: PacketCodec<CommandExecutionC2SPacket> = PacketCodecs.of<CommandExecutionC2SPacket>(
        (writer, value) => {
            writer.writeString(value.command);
            writer.writeUUID(value.uuid);
        },
        (reader) => {
            return new CommandExecutionC2SPacket(reader.readString(), reader.readUUID());
        }
    );

    public readonly command: string;
    public readonly uuid: UUID;

    public constructor(command: string, uuid: UUID) {
        this.command = command;
        this.uuid = uuid;
    }

    public getId(): PayloadId<CommandExecutionC2SPacket> {
        return CommandExecutionC2SPacket.ID;
    }
}