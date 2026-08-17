import type {PacketListener} from "../../../network/handler/PacketListener.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import {GaussianRandom} from "../../../utils/math/GaussianRandom.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ConnectionState} from "../../../server/network/ConnectionState.ts";
import type {RelayMessage} from "../../../network/packet/relay/RelayMessage.ts";
import type {PlayerDisconnectS2CPacket} from "../../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {BatchBuffer} from "../../../network/packet/common/BatchBuffer.ts";

export abstract class ClientCommonHandler implements PacketListener {
    protected readonly connection: ClientConnection;
    protected readonly client: NovaFlightClient;
    protected readonly random = new GaussianRandom();
    private readonly phase: ConnectionState;

    // protected readonly handlers: Consumer<Payload>[] = [];

    protected constructor(client: NovaFlightClient, connection: ClientConnection, phase: ConnectionState) {
        this.client = client;
        this.connection = connection;
        this.phase = phase;
    }

    public onDisconnected(): void {
    }

    public onRelayMessage(packet: RelayMessage): void {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');

        if (type === 'INFO') this.relayInfoHandler(msg);
        else if (type === 'ERR') this.relayErrorHandler(msg);
    }

    public onDetached() {
        this.connection.disconnect();
    }

    private relayInfoHandler(_message: string): void {
    }

    private relayErrorHandler(message: string): void {
        this.client.setConnectError(message);
    }

    public onBatch(packet: BatchBuffer): void {
        const packets = packet.parse();
        for (const p of packets) {
            try {
                p.accept(this)
            } catch (e) {
                console.error(e);
            }
        }
    }

    public onPlayerDisconnect(packet: PlayerDisconnectS2CPacket) {
        if (packet.uuid !== this.client.clientId) return;
        this.connection.disconnect();

        this.client.setPause(true);
        this.client.setConnectError(packet.reason);
    }

    public send(packet: Payload): void {
        this.connection.send(packet);
    }

    public sendImmediately(packet: Payload): void {
        this.connection.sendImmediately(packet);
    }

    public accept(payload: Payload): void {
        payload.accept(this);
    }

    public tick() {
    }

    public clear() {
    }

    public getPhase(): ConnectionState {
        return this.phase;
    };
}