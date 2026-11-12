import type {PacketListener} from "../../../network/handler/PacketListener.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ConnectionState} from "../../../server/network/ConnectionState.ts";
import type {RelayMessage} from "../../../network/packet/relay/RelayMessage.ts";
import type {PlayerDisconnectS2CPacket} from "../../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {BatchBuffer} from "../../../network/packet/common/BatchBuffer.ts";
import {GaussianRandom} from "../../../utils/math/random/GaussianRandom.ts";
import {RelayCodeMap} from "../../../network/RelayCodeMap.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";

export abstract class ClientCommonHandler implements PacketListener {
    protected readonly connection: ClientConnection;
    protected readonly client: NovaFlightClient;
    protected readonly gaussian: GaussianRandom;

    private readonly phase: ConnectionState;

    protected constructor(client: NovaFlightClient, connection: ClientConnection, phase: ConnectionState) {
        this.client = client;
        this.connection = connection;
        this.phase = phase;
        this.gaussian = new GaussianRandom();
    }

    public onDisconnected(): void {
    }

    public onRelayMessage(packet: RelayMessage): void {
        const key = RelayCodeMap.get(packet.code);
        const message = key ? TranslatableText.of(key).asString() : 'Unknown Error';
        this.client.leaveAndShow(message);
    }

    public onDetached() {
        this.connection.disconnect();
    }

    public onBatch(packet: BatchBuffer): void {
        packet.parse(this);
    }

    public onPlayerDisconnect(packet: PlayerDisconnectS2CPacket) {
        if (packet.uuid !== this.client.clientId) return;
        this.connection.disconnect();

        this.client.setPause(true);
        this.client.leaveAndShow(new TranslatableText(packet.reason, packet.args));
    }

    public send(packet: Payload): void {
        this.connection.send(packet);
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
    }
}