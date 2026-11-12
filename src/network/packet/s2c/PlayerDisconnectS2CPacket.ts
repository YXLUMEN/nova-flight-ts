import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import type {ClientCommonHandler} from "../../../client/network/handler/ClientCommonHandler.ts";

export class PlayerDisconnectS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerDisconnectS2CPacket> = payloadType('player_disconnect');
    public static readonly CODEC: PacketCodec<PlayerDisconnectS2CPacket> = PacketCodecs.adapt3(
        PacketCodecs.UUID,
        val => val.uuid,
        PacketCodecs.STRING,
        val => val.reason,
        PacketCodecs.listOf(PacketCodecs.STRING),
        val => val.args,
        PlayerDisconnectS2CPacket.new
    );
    private static readonly empty = [];

    public readonly uuid: UUID;
    public readonly reason: string;
    public readonly args: string[];

    public constructor(uuid: UUID, reason: string, args?: string[]) {
        this.uuid = uuid;
        this.reason = reason;
        this.args = args ?? PlayerDisconnectS2CPacket.empty;
    }

    private static new(uuid: UUID, reason: string, args: string[]) {
        return new PlayerDisconnectS2CPacket(uuid, reason, args);
    }

    public type(): PayloadType<PlayerDisconnectS2CPacket> {
        return PlayerDisconnectS2CPacket.ID;
    }

    public accept(listener: ClientCommonHandler): void {
        listener.onPlayerDisconnect(this);
    }

    public canProcessInTransition(): boolean {
        return true;
    }
}