import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../apis/types.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {PongS2CPacket} from "../../network/packet/s2c/PongS2CPacket.ts";
import type {ServerConnection} from "./ServerConnection.ts";
import type {PacketListener} from "./PacketListener.ts";
import {type ConnectionStateType} from "./ConnectionState.ts";

export abstract class ServerCommonHandler implements PacketListener {
    public static readonly LOGOUT = TranslatableText.of('network.disconnect.logout');
    public static readonly ILLEGAL_CHARACTER = TranslatableText.of('network.disconnect.illegal_character');

    protected readonly server: NovaFlightServer;
    protected readonly connection: ServerConnection;

    private readonly payloadHandlers = new HashMap<Identifier, Consumer<Payload>>();

    protected constructor(server: NovaFlightServer, connection: ServerConnection) {
        this.server = server;
        this.connection = connection;
    }

    public onDisconnected() {
        if (this.isHost()) {
            console.log('Stopping singleplayer server as player logged out');
            return this.server.halt();
        }
    }

    public onPing(): void {
        this.send(new PongS2CPacket());
    }

    public accepts(packet: Payload): void {
        this.payloadHandlers.get(packet.getId().id)?.(packet);
    }

    public send(packet: Payload): void {
        this.connection.send(packet);
    }

    public broadcast(packet: Payload): void {
        this.connection.broadcast(packet);
    }

    public disconnect(reason: TranslatableText): void {
        this.connection.disconnect(reason);
    }

    public forceDisconnect(): void {
        this.connection.forceDisconnect();
    }

    public shouldRemove(): boolean {
        return this.connection.shouldRemove();
    }

    protected isHost() {
        return this.connection.isHost();
    }

    public clear(): void {
        this.payloadHandlers.clear();
    }

    public register<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.payloadHandlers.set(id.id, handler as Consumer<Payload>);
    }

    public abstract getPhase(): ConnectionStateType;

    protected abstract getProfile(): GameProfile;
}