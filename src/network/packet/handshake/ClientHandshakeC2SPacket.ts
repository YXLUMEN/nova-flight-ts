import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import type {ServerHandshakeHandler} from "../../../server/network/handler/ServerHandshakeHandler.ts";

export class ClientHandshakeC2SPacket implements Payload {
    public static readonly ID: PayloadType<ClientHandshakeC2SPacket> = payloadType('client_handshake');
    public static readonly CODEC: PacketCodec<ClientHandshakeC2SPacket> = PacketCodecs.adapt3(
        PacketCodecs.UUID,
        val => val.clientId,
        PacketCodecs.INT32,
        val => val.protocolVersion,
        PacketCodecs.INT32,
        val => val.gameVersion,
        ClientHandshakeC2SPacket.new
    );

    public readonly clientId: UUID;
    public readonly protocolVersion: number;
    public readonly gameVersion: number;

    public constructor(clientId: UUID, protocolVersion: number, gameVersion: number) {
        this.clientId = clientId;
        this.protocolVersion = protocolVersion;
        this.gameVersion = gameVersion;
    }

    public static new(clientId: UUID, protocolVersion: number, gameVersion: number) {
        return new ClientHandshakeC2SPacket(clientId, protocolVersion, gameVersion);
    }

    public type(): PayloadType<ClientHandshakeC2SPacket> {
        return ClientHandshakeC2SPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public accept(listener: ServerHandshakeHandler): void {
        listener.onClientHandshake?.(this);
    }

    public estimateSize(): number {
        return 24;
    }
}