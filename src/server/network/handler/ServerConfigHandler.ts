import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import {ClientReadyC2SPacket} from "../../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {ServerReadyS2CPacket} from "../../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import type {UUID} from "../../../type/types.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {ConnectionState, type ConnectionStateType} from "../ConnectionState.ts";

export class ServerConfigHandler extends ServerCommonHandler {
    public static readonly DUPLICATE_PLAYER = TranslatableText.of('network.disconnect.duplicate_player');
    public static readonly PROMOTE_FAIL = TranslatableText.of('network.disconnect.promote_fail');
    public static readonly INVALID_STATE = TranslatableText.of("network.disconnect.invalid_state");

    private attemptUUID: UUID | null = null;
    private profile: GameProfile | null = null;

    public constructor(server: NovaFlightServer, connection: ServerConnection) {
        super(server, connection);
        this.registryHandler();
    }

    public onClientReady(packet: ClientReadyC2SPacket) {
        if (this.attemptUUID !== null && this.attemptUUID !== packet.clientId) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }
        if (this.server.world === null) return;

        this.attemptUUID = packet.clientId;
        this.send(new ServerReadyS2CPacket());
    }

    private onPlayerAttemptLogin(packet: PlayerAttemptLoginC2SPacket) {
        if (this.connection.getState() !== this.getPhase() || this.attemptUUID !== packet.clientId) {
            this.disconnect(ServerConfigHandler.INVALID_STATE);
            return;
        }

        try {
            const uuid: UUID = packet.clientId;
            const manager = this.server.playerManager;
            if (manager.isPlayerExists(uuid)) {
                console.warn(`A duplicate player try to login with uuid ${uuid}`);
                this.disconnect(ServerConfigHandler.DUPLICATE_PLAYER);
                return;
            }

            // 同步销毁监听器,不处理第二次登录
            this.clear();
            this.profile = new GameProfile(packet.sessionId, packet.clientId, packet.playerName);
            this.promoteToPlaySession().catch(err => {
                console.error(err);
                this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
            });
        } catch (err) {
            if (err instanceof Error) {
                console.error(`Couldn't place player in world: ${err.name}:${err.message} at\n ${err.stack}`);
            } else console.error(err);

            this.disconnect(ServerConfigHandler.PROMOTE_FAIL);
        }
    }

    private async promoteToPlaySession() {
        if (!this.profile) throw new Error('Profile not created');

        const player = this.server.playerManager.createPlayer(this.profile);
        await this.server.playerManager.onPlayerLogin(this.connection, this.profile, player);
    }

    public tick() {
        if (!this.isHost()) {
            this.connection.checkActivate(10000);
        }
    }

    protected override getProfile(): GameProfile {
        if (!this.profile) throw new Error("Profile not available in config state");
        return this.profile;
    }

    public getPhase(): ConnectionStateType {
        return ConnectionState.CONFIGURATION;
    }

    private registryHandler() {
        this.register(ClientReadyC2SPacket.ID, this.onClientReady.bind(this));
        this.register(PlayerAttemptLoginC2SPacket.ID, this.onPlayerAttemptLogin.bind(this));
    }
}