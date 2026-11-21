import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import type {ClientProfileC2SPacket} from "../../../network/packet/handshake/ClientProfileC2SPacket.ts";
import type {ClientStartNegotiateC2SPacket} from "../../../network/packet/handshake/ClientStartNegotiateC2SPacket.ts";
import type {UUID} from "../../../type/types.ts";
import {isValidUUID} from "../../../utils/uuid_util.ts";
import {ClientHandshakeC2SPacket} from "../../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerReadyS2CPacket} from "../../../network/packet/handshake/ServerReadyS2CPacket.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {ServerProperties} from "../../ServerProperties.ts";
import {Log} from "../../../worker/log.ts";
import {ServerNegotiateHandler} from "./ServerNegotiateHandler.ts";
import {NegotiateProtocols} from "../../../network/protocol/NegotiateProtocols.ts";
import {ServerAllowNegotiateS2CPacket} from "../../../network/packet/handshake/ServerAllowNegotiateS2CPacket.ts";

export class ServerHandshakeHandler extends ServerCommonHandler {
    private static readonly STILL_LOADING: string = 'network.disconnect.still_loading';
    private static readonly UNMATCH_PROTOCOL: string = 'network.disconnect.unmach.protocal';
    private static readonly UNMATCH_GAME_VERSION: string = 'network.disconnect.unmach.game';
    private static readonly INVALID_UUID: string = 'network.disconnect.invalid.uuid';
    private static readonly INVALID_SESSION_ID: string = 'network.disconnect.invalid.session_id';
    private static readonly PLAYER_FULL: string = 'network.disconnect.player_full';

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
        // 在这里处理满员,因为后续要加入认证,协议面处理不了
        if (this.server.playerManager.playerCounts() >= ServerProperties.MAX_PLAYERS.get()) {
            this.disconnect(ServerHandshakeHandler.PLAYER_FULL);
            return;
        }

        if (this.attemptUUID !== null) {
            if (this.attemptUUID !== packet.clientId) {
                this.disconnect(ServerHandshakeHandler.INVALID_UUID);
                return;
            }
            if (++this.retransmitCount > ServerHandshakeHandler.MAX_HANDSHAKE_RETRY) {
                this.disconnect(ServerHandshakeHandler.INVALID_STATE);
                Log.warn(`Client "${this.attemptUUID}" reach max handshake limit`);
            }
            return;
        }

        if (this.isInvalid(HandshakeState.HELLO)) return;

        if (this.protocolVersion !== packet.protocolVersion) {
            this.disconnect(ServerHandshakeHandler.UNMATCH_PROTOCOL);
            return;
        }

        if (this.gameVersion !== packet.gameVersion) {
            this.disconnect(
                ServerHandshakeHandler.UNMATCH_GAME_VERSION,
                [String(this.gameVersion), String(packet.gameVersion)]
            );
            return;
        }

        if (this.server.world === null) {
            if (this.connection.isHost) return;
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
        if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > 128) {
            this.disconnect(ServerHandshakeHandler.INVALID_SESSION_ID);
            return;
        }

        if (this.attemptUUID !== packet.clientId || !isValidUUID(this.attemptUUID)) {
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
        this.send(ServerAllowNegotiateS2CPacket.INSTANCE);
    }

    public onClientStartNegotiate(_: ClientStartNegotiateC2SPacket) {
        if (this.isInvalid(HandshakeState.PROTOCOL_SWITCHING)) return;
        if (!this.authProfile) {
            this.disconnect(ServerHandshakeHandler.INVALID_STATE);
            Log.warn(`Client "${this.attemptUUID}" did not has a profile`);
            return;
        }

        const negotiate = new ServerNegotiateHandler(this.server, this.connection, this.authProfile);
        this.connection.cleanReceived();
        this.connection.setInbound(NegotiateProtocols.CLIENT_BOUND, negotiate);
        this.connection.setOutBound(NegotiateProtocols.SERVER_BOUND);
        this.state = HandshakeState.ACCEPTED;
        void negotiate.startNegotiate();
    }

    private isInvalid(state: HandshakeState) {
        if (this.state !== state) {
            this.disconnect(ServerHandshakeHandler.INVALID_STATE);
            return true;
        }
        return false;
    }

    public override tick() {
        this.connection.checkActivate(15_000);
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