import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {ClientReadyC2SPacket} from "../../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {ServerStartS2CPacket} from "../../../network/packet/s2c/ServerStartS2CPacket.ts";
import {ServerReadyS2CPacket} from "../../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";

export class ClientConfigHandler extends ClientCommonHandler {
    private maxSniffTimes = 16;
    private sniffInterval: number | undefined = undefined;

    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection);
        connection.setPacketListener(ConnectionState.CONFIGURATION, this);
    }

    public onServerStart(_: ServerStartS2CPacket) {
        this.clientReady();
    }

    public onServerReady(_: ServerReadyS2CPacket) {
        this.clear();

        this.connection.setPacketListener(ConnectionState.PLAY, this.client.networkHandler);
        this.sendImmediately(new PlayerAttemptLoginC2SPacket(
            this.client.clientId,
            this.client.connection.getSessionId(),
            this.client.playerName
        ));
    }

    public clientReady() {
        this.stopSniff();

        const packet = new ClientReadyC2SPacket(this.client.clientId);
        this.sendImmediately(packet);

        let times = 0;
        this.sniffInterval = setInterval(() => {
            times++;
            try {
                this.sendImmediately(packet);
            } catch (e) {
                this.stopSniff();
                console.error(e);
            }
            if (times >= this.maxSniffTimes) {
                this.stopSniff();
                this.client.setConnectError('无法连接至服务器');
            }
        }, 2000);
    }

    private stopSniff() {
        clearInterval(this.sniffInterval);
        this.sniffInterval = undefined;
    }

    public getPhase(): ConnectionState {
        return ConnectionState.CONFIGURATION;
    }

    public clear(): void {
        super.clear();
        clearInterval(this.sniffInterval);
    }
}