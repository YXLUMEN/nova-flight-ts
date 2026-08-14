import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {ClientReadyC2SPacket} from "../../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {ServerReadyS2CPacket} from "../../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import type {UUID} from "../../../type/types.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {ConnectionState} from "../ConnectionState.ts";
import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import {PendingSpawn} from "./PendingSpawn.ts";
import {TimeoutError} from "../../../type/errors.ts";

export class ServerConfigHandler extends ServerCommonHandler {
    public static readonly PROMOTE_FAIL = TranslatableText.of('network.disconnect.promote.fail');
    public static readonly PROMOTE_TIMEOUT = TranslatableText.of('network.disconnect.promote.timeout');

    private attemptUUID: UUID | null = null;
    private profile: GameProfile | null = null;
    private spawnTask: PendingSpawn | null = null;

    public constructor(server: NovaFlightServer, connection: ServerConnection) {
        super(server, connection);
    }

    public onDisconnected() {
        this.spawnTask?.close();
        this.spawnTask = null;

        super.onDisconnected();
    }

    public onClientReady(packet: ClientReadyC2SPacket) {
        if (this.attemptUUID !== null && this.attemptUUID !== packet.clientId) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }

        if (this.server.world === null) return;

        this.attemptUUID = packet.clientId;
        this.send(ServerReadyS2CPacket.INSTANCE);
    }

    public onPlayerAttemptLogin(packet: PlayerAttemptLoginC2SPacket) {
        if (this.connection.getState() !== this.getPhase() || this.attemptUUID !== packet.clientId) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }

        if (this.spawnTask !== null) return;

        if (this.server.playerManager.hasLogin(this.attemptUUID)) {
            console.warn(`[Server] A duplicate player try to login with uuid ${this.attemptUUID}`);
            this.disconnect(ServerConfigHandler.DUPLICATE_PLAYER);
            return;
        }

        this.profile = new GameProfile(packet.sessionId, packet.clientId, packet.playerName);
        this.spawnTask = new PendingSpawn(this.server, this.profile);

        void this.promoteToPlaySession(this.spawnTask);
    }

    private async promoteToPlaySession(spawn: PendingSpawn) {
        try {
            await spawn.start();
            if (!spawn.ready()) {
                this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
                return;
            }

            // this.send(ServerFinishConfigS2CPacket.INSTANCE);

            const success = spawn.spawn(this.connection);
            if (success) return;
            this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
        } catch (err) {
            if (err instanceof TimeoutError) {
                console.warn(`[Server] Promote player ${this.profile?.name} timeout`);
                this.disconnect(ServerConfigHandler.PROMOTE_TIMEOUT);
                return;
            }

            console.error('[Server] Error occurrence when promote player session', err);
            this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
        } finally {
            spawn.close();
        }
    }

    public tick() {
        if (!this.isHost()) {
            this.connection.checkActivate(10_000);
        }
    }

    public getPhase(): ConnectionState {
        return ConnectionState.CONFIGURATION;
    }
}