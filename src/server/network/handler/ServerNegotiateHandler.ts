import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import type {PubKeyC2SPacket} from "../../../network/packet/negotiate/PubKeyC2SPacket.ts";
import type {ClientStartConfigC2SPacket} from "../../../network/packet/negotiate/ClientStartConfigC2SPacket.ts";
import {wrapKey} from "../../../network/crypto/GCMHelper.ts";
import {GCMScope} from "../../../network/crypto/GCMScope.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {ConnectionState} from "../ConnectionState.ts";
import {ECDHKeyAgreement} from "../../../network/crypto/ECDHKeyAgreement.ts";
import {PubKeyS2CPacket} from "../../../network/packet/negotiate/PubKeyS2CPacket.ts";
import {GroupKeyS2CPacket} from "../../../network/packet/negotiate/GroupKeyS2CPacket.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerConfigHandler} from "./ServerConfigHandler.ts";
import {ConfigProtocols} from "../../../network/protocol/ConfigProtocols.ts";
import {EncryptSessionChannel} from "../channel/EncryptSessionChannel.ts";
import {ServerAllowConfigS2CPacket} from "../../../network/packet/negotiate/ServerAllowConfigS2CPacket.ts";
import {ServerEncryptNetBus} from "../bus/ServerEncryptNetBus.ts";
import {NonceGenerator} from "../../../network/crypto/NonceGenerator.ts";
import {GCMSession} from "../../../network/crypto/GCMSession.ts";
import {ServerProperties} from "../../ServerProperties.ts";

const GEN_KEY_FAIL = 'network.disconnect.fail.session_key';

export class ServerNegotiateHandler extends ServerCommonHandler {
    private readonly profile: GameProfile;

    private readonly group: CryptoKey | null = null;
    private readonly keyGenerator: ECDHKeyAgreement | null = null;
    private session: GCMSession | null = null;
    private salt: Uint8Array<ArrayBuffer> | null = null;

    private state: NegotiateState = NegotiateState.EXPORT_PUB_KEY;

    public constructor(server: NovaFlightServer, connection: ServerConnection, profile: GameProfile) {
        super(server, connection);
        this.profile = profile;

        const bus = server.networkBus;
        if (bus instanceof ServerEncryptNetBus) {
            this.group = bus.getGroupKey();
            this.keyGenerator = bus.agreement;
        }
    }

    public override onDisconnected() {
        super.onDisconnected();
        this.state = NegotiateState.CANCEL;
    }

    public async startNegotiate() {
        if (this.isInvalid(NegotiateState.EXPORT_PUB_KEY)) return;
        this.state = NegotiateState.PENDING_EXPORT;

        if (!this.group || !this.keyGenerator) {
            // 不加密,跳过
            this.state = NegotiateState.PROTOCOL_SWITCHING;
            this.onClientFinishNegotiate();
            return;
        }

        const pubkey = await this.keyGenerator.publicKey();
        this.salt = crypto.getRandomValues(new Uint8Array(PubKeyS2CPacket.SALT_LEN));
        this.state = NegotiateState.IMPORT_PEER;

        this.send(new PubKeyS2CPacket(new Uint8Array(pubkey), this.salt));
    }

    public async onClientPubKey(packet: PubKeyC2SPacket) {
        if (this.isInvalid(NegotiateState.IMPORT_PEER)) return;
        this.state = NegotiateState.PENDING_IMPORT;

        if (!this.group || !this.keyGenerator) {
            this.disconnect(GEN_KEY_FAIL);
            return;
        }

        const pubkey = await this.keyGenerator.publicKey();
        const peer = await this.keyGenerator.importPublicKey(packet.pubKey);
        const info = await ECDHKeyAgreement.transcriptInfo(pubkey, packet.pubKey);
        const key = await this.keyGenerator.deriveKey(
            peer,
            this.salt!,
            info,
            ['wrapKey', 'encrypt', 'decrypt']
        );

        const nonce = new NonceGenerator(GCMScope.S_SESSION);
        const session = new GCMSession(key, nonce);
        this.session = session;

        const iv = session.nonce();
        const wrappered = await wrapKey(key, iv, this.group);

        this.state = NegotiateState.PROTOCOL_SWITCHING;
        this.send(new GroupKeyS2CPacket(new Uint8Array(wrappered), iv));
    }

    public onClientFinishNegotiate() {
        if (this.isInvalid(NegotiateState.PROTOCOL_SWITCHING)) return;
        this.state = NegotiateState.FINISH;
        // 确保客户端已经完成状态切换
        this.send(ServerAllowConfigS2CPacket.INSTANCE);
    }

    public onClientPromoteToConfig(_: ClientStartConfigC2SPacket) {
        if (this.isInvalid(NegotiateState.FINISH)) return;

        let canVerify = false;
        const bus = this.server.networkBus;
        if (bus instanceof ServerEncryptNetBus) {
            if (!this.session) {
                this.disconnect(GEN_KEY_FAIL);
                return;
            }
            const channel = new EncryptSessionChannel(bus, this.session, this.connection.sid);
            this.connection.channelActive(channel);

            if (ServerProperties.PLAYER_VERIFY.get()) {
                canVerify = true;
            }
            console.log(`Channel "${this.connection.sid}" encrypted`);
        }

        const config = new ServerConfigHandler(this.server, this.connection, this.profile, canVerify);
        this.connection.cleanReceived();
        this.connection.setInbound(ConfigProtocols.CLIENT_BOUND, config);
        this.connection.setOutBound(ConfigProtocols.SERVER_BOUND);
        config.startConfiguration();
    }

    private isInvalid(state: NegotiateState) {
        if (state !== this.state) {
            this.disconnect(ServerNegotiateHandler.INVALID_STATE);
            return true;
        }
        return false;
    }

    public getPhase(): ConnectionState {
        return ConnectionState.NEGOTIATION;
    }
}

const enum NegotiateState {
    EXPORT_PUB_KEY,
    PENDING_EXPORT,
    IMPORT_PEER,
    PENDING_IMPORT,
    PROTOCOL_SWITCHING,
    FINISH,
    CANCEL,
}