import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {PendingSpawn} from "./PendingSpawn.ts";
import {TimeoutError} from "../../../type/errors.ts";
import {ServerFinishConfigS2CPacket} from "../../../network/packet/config/ServerFinishConfigS2CPacket.ts";
import {Log} from "../../../utils/Log.ts";
import type {ClientStartPlayC2SPacket} from "../../../network/packet/config/ClientStartPlayC2SPacket.ts";

export class ServerConfigHandler extends ServerCommonHandler {
    public static readonly PROMOTE_FAIL: string = 'network.disconnect.promote.fail';
    public static readonly PROMOTE_TIMEOUT: string = 'network.disconnect.promote.timeout';

    private readonly profile: GameProfile;
    private spawnTask: PendingSpawn | null = null;
    private confirm: PromiseWithResolvers<void> | null = null;

    public constructor(server: NovaFlightServer, connection: ServerConnection, profile: GameProfile) {
        super(server, connection);
        this.profile = profile;
    }

    public override onDisconnected() {
        this.spawnTask?.close();
        this.spawnTask = null;

        super.onDisconnected();
    }

    public startConfiguration() {
        if (!this.connection.isState(this.getPhase())) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }

        if (this.server.playerManager.hasLogin(this.profile.clientId)) {
            Log.warn(`[Server] A duplicate player try to login with profile ${this.profile}`);
            this.disconnect(ServerConfigHandler.DUPLICATE_PLAYER);
            return;
        }

        this.spawnTask = new PendingSpawn(this.server, this.profile);
        void this.promoteToPlaySession(this.spawnTask);
    }

    public onClientConfirm(_: ClientStartPlayC2SPacket) {
        if (this.confirm === null) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }
        this.confirm.resolve();
    }

    private async promoteToPlaySession(spawn: PendingSpawn) {
        try {
            await spawn.start();
            if (!spawn.ready()) {
                this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
                return;
            }

            this.confirm ??= Promise.withResolvers<void>();
            this.send(ServerFinishConfigS2CPacket.INSTANCE);
            await this.confirm.promise;

            const success = spawn.spawn(this.connection);
            if (success) return;
            this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
        } catch (err) {
            if (err instanceof TimeoutError) {
                Log.warn(`[Server] Promote player ${this.profile?.name} timeout`);
                this.disconnect(ServerConfigHandler.PROMOTE_TIMEOUT);
                return;
            }

            Log.error(`[Server] Error occur when promote player session:\n ${err}`);
            this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
        } finally {
            spawn.close();
            this.confirm?.resolve();
            this.confirm = null;
        }
    }

    public override tick() {
        if (!this.isHost()) {
            this.connection.checkActivate(10_000);
        }
    }

    public getPhase(): ConnectionState {
        return ConnectionState.CONFIGURATION;
    }
}