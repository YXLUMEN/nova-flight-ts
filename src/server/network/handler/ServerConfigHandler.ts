import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import type {ClientStartPlayC2SPacket} from "../../../network/packet/config/ClientStartPlayC2SPacket.ts";
import type {LoginC2SPacket} from "../../../network/packet/config/LoginC2SPacket.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {PendingSpawn} from "./PendingSpawn.ts";
import {TimeoutError} from "../../../type/errors.ts";
import {ServerFinishConfigS2CPacket} from "../../../network/packet/config/ServerFinishConfigS2CPacket.ts";
import {Log} from "../../../utils/Log.ts";
import {RequireLoginS2CPacket} from "../../../network/packet/config/RequireLoginS2CPacket.ts";
import {LoginResult, PlayerLogin} from "../../storage/PlayerLogin.ts";
import {ServerStorage} from "../../storage/ServerStorage.ts";

const PROMOTE_FAIL: string = 'network.disconnect.promote.fail';
const PROMOTE_TIMEOUT: string = 'network.disconnect.promote.timeout';
const INVALID_KEY: string = 'network.disconnect.login.invalid_key';
const UNMATCH_PASSKEY: string = 'network.disconnect.login.unmatch';

export class ServerConfigHandler extends ServerCommonHandler {
    private readonly profile: GameProfile;
    private readonly verifyAccount: boolean;
    private pendingLogin = false;
    private spawnTask: PendingSpawn | null = null;
    private confirm: PromiseWithResolvers<void> | null = null;

    public constructor(server: NovaFlightServer, connection: ServerConnection, profile: GameProfile, verifyAccount: boolean) {
        super(server, connection);
        this.profile = profile;
        this.verifyAccount = verifyAccount;
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

        if (this.verifyAccount) {
            this.send(RequireLoginS2CPacket.INSTANCE);
            return;
        }
        this.finishLogin();
    }

    public async onClientLogin(packet: LoginC2SPacket) {
        if (this.pendingLogin) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }
        this.pendingLogin = true;

        const key = packet.key;
        const verify = new PlayerLogin(ServerStorage.DB, this.profile.clientId);

        const result = await verify.login(key);
        if (result === LoginResult.NOT_REGISTRY) {
            this.handleLogin(await verify.registry(key));
            return;
        }

        this.handleLogin(result);
    }

    private handleLogin(result: LoginResult) {
        switch (result) {
            case LoginResult.LOGIN_SUCCESS:
                this.finishLogin();
                break;
            case LoginResult.INVALID_KEY:
                this.disconnect(INVALID_KEY);
                break;
            case LoginResult.UNMATCH_PASSKEY:
                this.disconnect(UNMATCH_PASSKEY);
                break;
            case LoginResult.INTERNAL_ERROR:
                this.disconnect(ServerConfigHandler.INTERNAL_ERROR);
                break;
            default:
                this.disconnect(ServerConfigHandler.INVALID_STATE);
                break;
        }
    }

    public onClientConfirm(_: ClientStartPlayC2SPacket) {
        if (this.confirm === null) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }
        this.confirm.resolve();
    }

    private finishLogin() {
        if (this.spawnTask) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }

        this.spawnTask = new PendingSpawn(this.server, this.profile);
        void this.promoteToPlaySession(this.spawnTask);
    }

    private async promoteToPlaySession(spawn: PendingSpawn) {
        try {
            await spawn.start();
            if (!spawn.ready()) {
                this.disconnect(PROMOTE_FAIL);
                return;
            }

            this.confirm ??= Promise.withResolvers<void>();
            this.send(ServerFinishConfigS2CPacket.INSTANCE);
            await this.confirm.promise;

            const success = spawn.spawn(this.connection);
            if (success) return;
            this.disconnect(PROMOTE_FAIL);
        } catch (err) {
            if (err instanceof TimeoutError) {
                Log.warn(`[Server] Promote player ${this.profile?.name} timeout`);
                this.disconnect(PROMOTE_TIMEOUT);
                return;
            }

            Log.error(`[Server] Error occur when promote player session:\n ${err}`);
            this.disconnect(PROMOTE_FAIL);
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