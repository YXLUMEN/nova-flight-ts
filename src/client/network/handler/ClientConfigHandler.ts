import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import type {ServerFinishConfigS2CPacket} from "../../../network/packet/config/ServerFinishConfigS2CPacket.ts";
import type {Payload} from "../../../network/Payload.ts";

export class ClientConfigHandler extends ClientCommonHandler {
    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.CONFIGURATION);
    }

    public onFinishConfig(_: ServerFinishConfigS2CPacket) {
        this.connection.setPacketListener(ConnectionState.PLAY, this.client.networkHandler);
    }

    public accept(payload: Payload) {
        if (!payload.canProcessInTransition?.()) return;
        super.accept(payload);
    }
}