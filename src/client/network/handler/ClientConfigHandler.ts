import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ServerFinishConfigS2CPacket} from "../../../network/packet/config/ServerFinishConfigS2CPacket.ts";
import {ConnectionState} from "../../../network/ConnectionState.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {PlayProtocol} from "../../../network/protocol/PlayProtocol.ts";
import {ClientStartPlayC2SPacket} from "../../../network/packet/config/ClientStartPlayC2SPacket.ts";

export class ClientConfigHandler extends ClientCommonHandler {
    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.CONFIGURATION);
    }

    public onFinishConfig(_: ServerFinishConfigS2CPacket) {
        this.send(ClientStartPlayC2SPacket.INSTANCE);
        this.connection.setInbound(PlayProtocol.SERVER_BOUND, this.client.networkHandler);
        this.connection.setOutBound(PlayProtocol.CLIENT_BOUND);
    }

    public override accept(payload: Payload) {
        if (!payload.inTransition?.()) return;
        super.accept(payload);
    }
}