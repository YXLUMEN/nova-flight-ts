import type {PacketListener} from "../../../network/handler/PacketListener.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import {GaussianRandom} from "../../../utils/math/GaussianRandom.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ConnectionState} from "../../../server/network/ConnectionState.ts";
import type {RelayMessage} from "../../../network/packet/relay/RelayMessage.ts";
import type {BatchBufferPacket} from "../../../network/packet/BatchBufferPacket.ts";
import {EmptyHandler} from "../../../network/handler/EmptyHandler.ts";

export abstract class ClientCommonHandler implements PacketListener {
    protected readonly connection: ClientConnection;
    protected readonly client: NovaFlightClient;
    protected readonly random = new GaussianRandom();

    // protected readonly handlers: Consumer<Payload>[] = [];

    protected constructor(client: NovaFlightClient, connection: ClientConnection) {
        this.client = client;
        this.connection = connection;
    }

    public onRelayMessage(packet: RelayMessage): void {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');

        if (type === 'INFO') this.relayInfoHandler(msg);
        else if (type === 'ERR') this.relayErrorHandler(msg);
    }

    private relayInfoHandler(_message: string): void {
    }

    private relayErrorHandler(message: string): void {
        this.client.setConnectError(message);
    }

    public onBatch(packet: BatchBufferPacket): void {
        const packets = packet.parse();
        for (const p of packets) {
            try {
                p.accept(this)
            } catch (e) {
                console.error(e);
            }
        }
    }

    public send(packet: Payload): void {
        this.connection.send(packet);
    }

    public sendImmediately(packet: Payload): void {
        this.connection.sendImmediately(packet);
    }

    public accept(packet: Payload): void {
        packet.accept(this);
    }

    public onDisconnected(): void {
    }

    public clear() {
        this.connection.setPacketListener(this.getPhase(), new EmptyHandler(this.getPhase()));
    }

    public abstract getPhase(): ConnectionState;
}