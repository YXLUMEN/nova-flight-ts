import type {Payload} from "../../../network/Payload.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import type {ServerAllowConfigS2CPacket} from "../../../network/packet/handshake/ServerAllowConfigS2CPacket.ts";
import type {ServerStartS2CPacket} from "../../../network/packet/s2c/ServerStartS2CPacket.ts";
import type {ServerReadyS2CPacket} from "../../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {ClientHandshakeC2SPacket} from "../../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ClientProfileC2SPacket} from "../../../network/packet/handshake/ClientProfileC2SPacket.ts";
import {ClientConfigHandler} from "./ClientConfigHandler.ts";
import {ClientStartConfigC2SPacket} from "../../../network/packet/handshake/ClientStartConfigC2SPacket.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import {HandshakeProtocols} from "../../../network/protocol/HandshakeProtocols.ts";
import {ConfigProtocols} from "../../../network/protocol/ConfigProtocols.ts";

export class ClientHandshakeHandler extends ClientCommonHandler {
    private maxSniffTimes = 16;
    private sniffInterval: number | undefined = undefined;

    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.HANDSHAKING);
        connection.setInbound(HandshakeProtocols.SERVER_BOUND, this);
        connection.setOutBound(HandshakeProtocols.CLIENT_BOUND);
    }

    public onServerStart(_: ServerStartS2CPacket) {
        this.clientReady();
    }

    public onServerReady(_: ServerReadyS2CPacket) {
        this.stopSniff();

        this.send(new ClientProfileC2SPacket(
            this.client.clientId,
            this.client.connection.getSessionId(),
            this.client.playerName
        ));
    }

    public onAllowConfig(_: ServerAllowConfigS2CPacket) {
        this.stopSniff();

        const config = new ClientConfigHandler(this.client, this.connection);
        this.send(ClientStartConfigC2SPacket.INSTANCE);
        this.connection.setInbound(ConfigProtocols.SERVER_BOUND, config);
        this.connection.setOutBound(ConfigProtocols.CLIENT_BOUND);
    }

    public clientReady() {
        this.stopSniff();

        const packet = new ClientHandshakeC2SPacket(
            this.client.clientId,
            this.client.protocolVersion,
            this.client.version
        );

        this.send(packet);

        let times = 0;
        this.sniffInterval = setInterval(() => {
            times++;
            try {
                this.send(packet);
            } catch (e) {
                this.stopSniff();
                console.error(e);
                this.client.leaveAndShow('无法探测服务器');
                return;
            }
            if (times >= this.maxSniffTimes) {
                this.stopSniff();
                this.client.leaveAndShow('无法连接至服务器');
            }
        }, 2000);
    }

    private stopSniff() {
        clearInterval(this.sniffInterval);
        this.sniffInterval = undefined;
    }

    public override accept(payload: Payload) {
        if (payload.protocol?.() !== this.getPhase()) return;
        super.accept(payload);
    }

    public override clear() {
        this.stopSniff();
        super.clear();
    }
}