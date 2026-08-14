import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {ConnectionState} from "../ConnectionState.ts";
import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import {PendingSpawn} from "./PendingSpawn.ts";
import {TimeoutError} from "../../../type/errors.ts";
import {ServerFinishConfigS2CPacket} from "../../../network/packet/config/ServerFinishConfigS2CPacket.ts";

export class ServerConfigHandler extends ServerCommonHandler {
    public static readonly PROMOTE_FAIL = TranslatableText.of('network.disconnect.promote.fail');
    public static readonly PROMOTE_TIMEOUT = TranslatableText.of('network.disconnect.promote.timeout');

    private readonly profile: GameProfile;
    private spawnTask: PendingSpawn | null = null;

    public constructor(server: NovaFlightServer, connection: ServerConnection, profile: GameProfile) {
        super(server, connection);
        this.profile = profile;
    }

    public onDisconnected() {
        this.spawnTask?.close();
        this.spawnTask = null;

        super.onDisconnected();
    }

    public startConfiguration() {
        if (this.connection.getState() !== this.getPhase()) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }

        if (this.server.playerManager.hasLogin(this.profile.clientId)) {
            console.warn(`[Server] A duplicate player try to login with profile ${this.profile}`);
            this.disconnect(ServerConfigHandler.DUPLICATE_PLAYER);
            return;
        }

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

            this.send(ServerFinishConfigS2CPacket.INSTANCE);

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