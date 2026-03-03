import {GameProfile} from "../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {ServerConnection} from "./ServerConnection.ts";
import {ClientReadyC2SPacket} from "../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import type {UUID} from "../../apis/types.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ConnectionState, type ConnectionStateType} from "./ConnectionState.ts";

export class ServerConfigSession extends ServerCommonHandler {
    public static readonly DUPLICATE_PLAYER = TranslatableText.of('network.disconnect.duplicate_player');
    public static readonly AUTH_FAILED = TranslatableText.of('network.disconnect.auth_failed');
    public static readonly INVALID_STATE = TranslatableText.of("network.disconnect.invalid_state");

    private profile: GameProfile | null = null;

    public constructor(server: NovaFlightServer, connection: ServerConnection) {
        super(server, connection);
        this.registryHandler();
    }

    public onClientReady(_: ClientReadyC2SPacket) {
        if (this.server.world === null) return;
        this.send(new ServerReadyS2CPacket());
    }

    private async onPlayerAttemptLogin(packet: PlayerAttemptLoginC2SPacket) {
        if (this.connection.getState() !== this.getPhase()) {
            this.disconnect(ServerConfigSession.INVALID_STATE);
            return;
        }

        try {
            const uuid: UUID = packet.clientId;
            const manager = this.server.playerManager;
            if (manager.isPlayerExists(uuid)) {
                console.warn(`A duplicate player try to login with id ${uuid}`);
                this.disconnect(ServerConfigSession.DUPLICATE_PLAYER);
                return;
            }

            this.profile = new GameProfile(packet.sessionId, packet.clientId, packet.playerName);
            await this.promoteToPlaySession();
        } catch (err) {
            if (err instanceof Error) {
                console.error(`Couldn't place player in world: ${err.name}:${err.message} at\n ${err.stack}`);
            } else console.error(err);

            this.disconnect(ServerConfigSession.AUTH_FAILED);
        }
    }

    private async promoteToPlaySession() {
        if (!this.profile) throw new Error('Profile not created');

        const player = this.server.playerManager.createPlayer(this.profile);
        await this.server.playerManager.onPlayerAttemptLogin(this.connection, this.profile, player);
        this.clear();
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