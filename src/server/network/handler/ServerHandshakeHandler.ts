import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import {ClientHandshakeC2SPacket} from "../../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import {ServerConfigHandler} from "./ServerConfigHandler.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {UUIDUtil} from "../../../utils/UUIDUtil.ts";
import type {UUID} from "../../../type/types.ts";
import {ServerReadyS2CPacket} from "../../../network/packet/s2c/ServerReadyS2CPacket.ts";
import type {ClientStartConfigC2SPacket} from "../../../network/packet/handshake/ClientStartConfigC2SPacket.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {ServerAllowConfigS2CPacket} from "../../../network/packet/handshake/ServerAllowConfigS2CPacket.ts";
import type {ClientProfileC2SPacket} from "../../../network/packet/handshake/ClientProfileC2SPacket.ts";

export class ServerHandshakeHandler extends ServerCommonHandler {
    private static readonly STILL_LOADING = TranslatableText.of('network.disconnect.still_loading');
    private static readonly UNMATCH_PROTOCOL = TranslatableText.of('network.disconnect.unmach.protocal');
    private static readonly INVALID_UUID = TranslatableText.of('network.disconnect.invalid.uuid');
    private static readonly INVALID_SESSION_ID = TranslatableText.of('network.disconnect.invalid.session_id');

    private static readonly MAX_HANDSHAKE_RETRY = 5;

    private readonly protocolVersion: number;
    private readonly gameVersion: number;

    private state: HandshakeState = HandshakeState.HELLO;
    private attemptUUID: UUID | null = null;
    private authProfile: GameProfile | null = null;
    private retransmitCount: number = 0;

    public constructor(server: NovaFlightServer, connection: ServerConnection) {
        super(server, connection);
        this.protocolVersion = server.protocolVersion;
        this.gameVersion = server.version;
    }

    public onClientHandshake(packet: ClientHandshakeC2SPacket) {
        if (this.attemptUUID !== null) {
            if (this.attemptUUID !== packet.clientId) {
                this.disconnect(ServerHandshakeHandler.INVALID_UUID);
                return;
            }
            if (++this.retransmitCount > ServerHandshakeHandler.MAX_HANDSHAKE_RETRY) {
                this.disconnect(ServerHandshakeHandler.INVALID_STATE);
            }
            return;
        }

        if (this.isInvalid(HandshakeState.HELLO)) return;

        if (this.protocolVersion !== packet.protocolVersion) {
            this.disconnect(ServerHandshakeHandler.UNMATCH_PROTOCOL);
            return;
        }

        if (this.gameVersion !== packet.gameVersion) {
            const reason = new TranslatableText(
                'network.disconnect.unmach.game',
                [this.gameVersion.toString(), packet.gameVersion.toString()]
            );
            this.disconnect(reason);
            return;
        }

        if (this.server.world === null) {
            if (this.connection.isHost()) return;
            this.disconnect(ServerHandshakeHandler.STILL_LOADING);
            return;
        }

        this.attemptUUID = packet.clientId;
        this.state = HandshakeState.VERIFY;
        this.send(ServerReadyS2CPacket.INSTANCE);
    }

    public onClientProfile(packet: ClientProfileC2SPacket) {
        if (this.isInvalid(HandshakeState.VERIFY)) return;

        const sessionId = packet.sessionId;
        if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > 64) {
            this.disconnect(ServerHandshakeHandler.INVALID_SESSION_ID);
            return;
        }

        if (this.attemptUUID !== packet.clientId || !UUIDUtil.isValidUUID(this.attemptUUID)) {
            this.disconnect(ServerHandshakeHandler.INVALID_UUID);
            return;
        }

        const manager = this.server.playerManager;
        if (manager.hasLogin(packet.clientId) || manager.getPlayerByName(packet.playerName) !== null) {
            this.disconnect(ServerHandshakeHandler.DUPLICATE_PLAYER);
            return;
        }

        this.authProfile = new GameProfile(packet.sessionId, packet.clientId, packet.playerName);
        this.state = HandshakeState.PROTOCOL_SWITCHING;
        this.send(ServerAllowConfigS2CPacket.INSTANCE);
    }

    public onClientPromoteToConfig(_: ClientStartConfigC2SPacket) {
        if (this.isInvalid(HandshakeState.PROTOCOL_SWITCHING)) return;
        if (!this.authProfile) {
            this.disconnect(ServerHandshakeHandler.INVALID_STATE);
            return;
        }

        const config = new ServerConfigHandler(this.server, this.connection, this.authProfile);
        this.connection.setPacketListener(ConnectionState.CONFIGURATION, config);
        this.state = HandshakeState.ACCEPTED;
        config.startConfiguration();
    }

    private isInvalid(state: HandshakeState) {
        if (this.state !== state) {
            this.disconnect(ServerHandshakeHandler.INVALID_STATE);
            return true;
        }
        return false;
    }

    public tick() {
        this.connection.checkActivate(30_000);
    }

    public getPhase(): ConnectionState {
        return ConnectionState.HANDSHAKING;
    }
}

const enum HandshakeState {
    HELLO,
    VERIFY,
    PROTOCOL_SWITCHING,
    ACCEPTED,
}