import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {GameProfile} from "../../entity/GameProfile.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {Return} from "../../../type/types.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {PongS2CPacket} from "../../../network/packet/s2c/PongS2CPacket.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import type {PacketListener} from "./PacketListener.ts";
import {type ConnectionStateType} from "../ConnectionState.ts";
import {Log} from "../../../worker/log.ts";
import {NetworkChannel} from "../../../network/NetworkChannel.ts";
import {EmptyHandler} from "./EmptyHandler.ts";

export abstract class ServerCommonHandler implements PacketListener {
    public static readonly LOGOUT = TranslatableText.of('network.disconnect.logout');
    public static readonly ILLEGAL_CHARACTER = TranslatableText.of('network.disconnect.illegal_character');
    public static readonly MOVE_TOO_FAST = TranslatableText.of('network.disconnect.move_too_fast');

    protected readonly server: NovaFlightServer;
    protected readonly connection: ServerConnection;

    protected constructor(server: NovaFlightServer, connection: ServerConnection) {
        this.server = server;
        this.connection = connection;
    }

    public onDisconnected() {
        if (this.isHost()) {
            console.log('[Server] Stopping singleplayer server as player logged out');
            this.server.halt().then();
        }
    }

    public onPing(): void {
        this.send(PongS2CPacket.INSTANCE);
    }

    public accepts(packet: Payload): void {
        packet.accept(this);
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
        this.connection.setPacketListener(this.getPhase(), new EmptyHandler(this.getPhase()));
    }

    public static* buildBatch<T, P extends Payload, B extends Payload>(
        entries: Iterable<T>,
        c0: Return<T, P>,
        c1: Return<P[], B>,
        maxSize = NetworkChannel.MAX_PACKET_SIZE - 14
    ) {
        let currentSize = 0;
        const currentBatch: P[] = [];
        for (const entry of entries) {
            const packet = c0(entry);
            const estSize = packet.estimateSize!();

            if (estSize >= maxSize) {
                Log.warn(`Packet ${packet} to large, skip sync`);
                continue;
            }

            if (currentSize + estSize >= maxSize && currentBatch.length > 0) {
                yield c1(currentBatch);
                currentBatch.length = 0;
                currentSize = 0;
            }
            currentBatch.push(packet);
            currentSize += estSize;
        }

        if (currentBatch.length > 0) {
            yield c1(currentBatch);
        }
    }

    public static* buildBatchWithEst<T, B>(
        entries: Iterable<T>,
        estimateSize: Return<T, number>,
        buildBatch: Return<T[], B>,
        maxPacketSize = NetworkChannel.MAX_PACKET_SIZE - 14
    ) {
        let currentSize = 0;
        const currentBatch: T[] = [];

        for (const entry of entries) {
            const estSize = estimateSize(entry);

            if (estSize >= maxPacketSize) {
                Log.warn(`Entry too large (${estSize} >= ${maxPacketSize}), skipped`);
                continue;
            }

            if (currentSize + estSize > maxPacketSize && currentBatch.length > 0) {
                yield buildBatch(currentBatch);
                currentBatch.length = 0;
                currentSize = 0;
            }

            currentBatch.push(entry);
            currentSize += estSize;
        }

        if (currentBatch.length > 0) {
            yield buildBatch(currentBatch);
        }
    }

    public abstract getPhase(): ConnectionStateType;

    protected abstract getProfile(): GameProfile;
}