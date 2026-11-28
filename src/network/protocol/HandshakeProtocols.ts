import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {ServerReadyS2CPacket} from "../packet/handshake/ServerReadyS2CPacket.ts";
import {ClientProfileC2SPacket} from "../packet/handshake/ClientProfileC2SPacket.ts";
import {ClientHandshakeC2SPacket} from "../packet/handshake/ClientHandshakeC2SPacket.ts";
import {ServerStartS2CPacket} from "../packet/handshake/ServerStartS2CPacket.ts";
import {PlayerDisconnectS2CPacket} from "../packet/s2c/PlayerDisconnectS2CPacket.ts";
import {ServerAllowNegotiateS2CPacket} from "../packet/handshake/ServerAllowNegotiateS2CPacket.ts";
import {ClientStartNegotiateC2SPacket} from "../packet/handshake/ClientStartNegotiateC2SPacket.ts";

export class HandshakeProtocols {
    public static readonly SERVER_BOUND = ProtocolInfoBuilder.serverBound(
        ConnectionState.HANDSHAKING,
        builder => builder
            .add(ServerReadyS2CPacket.ID, ServerReadyS2CPacket.CODEC)
            .add(ServerStartS2CPacket.ID, ServerStartS2CPacket.CODEC)
            .add(ServerAllowNegotiateS2CPacket.ID, ServerAllowNegotiateS2CPacket.CODEC)
            .add(PlayerDisconnectS2CPacket.ID, PlayerDisconnectS2CPacket.CODEC)
    );

    public static readonly CLIENT_BOUND = ProtocolInfoBuilder.clientBound(
        ConnectionState.HANDSHAKING,
        builder => builder
            .add(ClientHandshakeC2SPacket.ID, ClientHandshakeC2SPacket.CODEC)
            .add(ClientProfileC2SPacket.ID, ClientProfileC2SPacket.CODEC)
            .add(ClientStartNegotiateC2SPacket.ID, ClientStartNegotiateC2SPacket.CODEC)
    );
}