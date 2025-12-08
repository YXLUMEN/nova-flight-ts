import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class CommandExecutionC2SPacket implements Payload {
    public static readonly ID: PayloadId<CommandExecutionC2SPacket> = {id: Identifier.ofVanilla('command_exec')};
    public static readonly CODEC: PacketCodec<CommandExecutionC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.command,
        to => new CommandExecutionC2SPacket(to)
    );
    public readonly command: string;

    public constructor(command: string) {
        this.command = command;
    }

    public getId(): PayloadId<CommandExecutionC2SPacket> {
        return CommandExecutionC2SPacket.ID;
    }
}