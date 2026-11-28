import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {ConnectionState} from "../../server/network/ConnectionState.ts";
import {PubKeyS2CPacket} from "../packet/negotiate/PubKeyS2CPacket.ts";
import {GroupKeyS2CPacket} from "../packet/negotiate/GroupKeyS2CPacket.ts";
import {PlayerDisconnectS2CPacket} from "../packet/s2c/PlayerDisconnectS2CPacket.ts";
import {ServerAllowConfigS2CPacket} from "../packet/negotiate/ServerAllowConfigS2CPacket.ts";
import {PubKeyC2SPacket} from "../packet/negotiate/PubKeyC2SPacket.ts";
import {ClientFinishNegC2SPacket} from "../packet/negotiate/ClientFinishNegC2SPacket.ts";
import {ClientStartConfigC2SPacket} from "../packet/negotiate/ClientStartConfigC2SPacket.ts";
import {RequireLoginS2CPacket} from "../packet/negotiate/RequireLoginS2CPacket.ts";
import {LoginC2SPacket} from "../packet/negotiate/LoginC2SPacket.ts";

export class NegotiateProtocols {
    public static readonly SERVER_BOUND = ProtocolInfoBuilder.serverBound(
        ConnectionState.NEGOTIATION,
        builder => builder
            .add(PubKeyS2CPacket.ID, PubKeyS2CPacket.CODEC)
            .add(RequireLoginS2CPacket.ID, RequireLoginS2CPacket.CODEC)
            .add(GroupKeyS2CPacket.ID, GroupKeyS2CPacket.CODEC)
            .add(ServerAllowConfigS2CPacket.ID, ServerAllowConfigS2CPacket.CODEC)
            .add(PlayerDisconnectS2CPacket.ID, PlayerDisconnectS2CPacket.CODEC)
    );

    public static readonly CLIENT_BOUND = ProtocolInfoBuilder.clientBound(
        ConnectionState.NEGOTIATION,
        builder => builder
            .add(PubKeyC2SPacket.ID, PubKeyC2SPacket.CODEC)
            .add(LoginC2SPacket.ID, LoginC2SPacket.CODEC)
            .add(ClientFinishNegC2SPacket.ID, ClientFinishNegC2SPacket.CODEC)
            .add(ClientStartConfigC2SPacket.ID, ClientStartConfigC2SPacket.CODEC)
    );
}