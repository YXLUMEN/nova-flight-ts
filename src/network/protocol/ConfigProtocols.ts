import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {ConnectionState} from "../../server/network/ConnectionState.ts";
import {ServerFinishConfigS2CPacket} from "../packet/config/ServerFinishConfigS2CPacket.ts";
import {PlayerDisconnectS2CPacket} from "../packet/s2c/PlayerDisconnectS2CPacket.ts";
import {ClientStartPlayC2SPacket} from "../packet/config/ClientStartPlayC2SPacket.ts";
import {RequireLoginS2CPacket} from "../packet/config/RequireLoginS2CPacket.ts";
import {LoginC2SPacket} from "../packet/config/LoginC2SPacket.ts";

export class ConfigProtocols {
    public static readonly SERVER_BOUND = ProtocolInfoBuilder.serverBound(
        ConnectionState.CONFIGURATION,
        builder => builder
            .add(ServerFinishConfigS2CPacket.ID, ServerFinishConfigS2CPacket.CODEC)
            .add(RequireLoginS2CPacket.ID, RequireLoginS2CPacket.CODEC)
            .add(PlayerDisconnectS2CPacket.ID, PlayerDisconnectS2CPacket.CODEC)
    );

    public static readonly CLIENT_BOUND = ProtocolInfoBuilder.clientBound(
        ConnectionState.CONFIGURATION,
        builder => builder
            .add(ClientStartPlayC2SPacket.ID, ClientStartPlayC2SPacket.CODEC)
            .add(LoginC2SPacket.ID, LoginC2SPacket.CODEC)
    );
}