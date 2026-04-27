import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class CommandExecutionC2SPacket implements Payload {
    public static readonly ID: PayloadId<CommandExecutionC2SPacket> = payloadId('command_exec');
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

    public accept(listener: ServerPlayHandler): void {
        listener.onCommandExecution(this);
    }
}