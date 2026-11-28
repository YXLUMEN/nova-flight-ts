import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import type {PubKeyC2SPacket} from "../../../network/packet/negotiate/PubKeyC2SPacket.ts";
import type {ClientStartConfigC2SPacket} from "../../../network/packet/negotiate/ClientStartConfigC2SPacket.ts";
import type {LoginC2SPacket} from "../../../network/packet/negotiate/LoginC2SPacket.ts";
import {wrapKey} from "../../../network/crypto/GCMHelper.ts";
import {GCMScope} from "../../../network/crypto/GCMScope.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import {ConnectionState} from "../../../network/ConnectionState.ts";
import {ECDHKeyAgreement} from "../../../network/crypto/ECDHKeyAgreement.ts";
import {PubKeyS2CPacket} from "../../../network/packet/negotiate/PubKeyS2CPacket.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerConfigHandler} from "./ServerConfigHandler.ts";
import {ConfigProtocols} from "../../../network/protocol/ConfigProtocols.ts";
import {EncryptSessionChannel} from "../channel/EncryptSessionChannel.ts";
import {ServerAllowConfigS2CPacket} from "../../../network/packet/negotiate/ServerAllowConfigS2CPacket.ts";
import {ServerEncryptNetBus} from "../bus/ServerEncryptNetBus.ts";
import {NonceGenerator} from "../../../network/crypto/NonceGenerator.ts";
import {GCMSession} from "../../../network/crypto/GCMSession.ts";
import {LoginResult, PlayerLogin} from "../../storage/PlayerLogin.ts";
import {ServerStorage} from "../../storage/ServerStorage.ts";
import {GroupKeyS2CPacket} from "../../../network/packet/negotiate/GroupKeyS2CPacket.ts";
import {RequireLoginS2CPacket} from "../../../network/packet/negotiate/RequireLoginS2CPacket.ts";
import {NegotiateProtocols} from "../../../network/protocol/NegotiateProtocols.ts";
import {ServerProperties} from "../../ServerProperties.ts";

const GEN_KEY_FAIL = 'network.disconnect.fail.session_key';
const INVALID_KEY: string = 'network.disconnect.login.invalid_key';
const UNMATCH_PASSKEY: string = 'network.disconnect.login.unmatch';

export class ServerNegotiateHandler extends ServerCommonHandler {
    private readonly profile: GameProfile;

    private readonly group: CryptoKey | null = null;
    private readonly keyGenerator: ECDHKeyAgreement | null = null;

    private privateKey: CryptoKey | null = null;
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
            // no encrypt, skip
            this.state = NegotiateState.LOGIN;
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
        this.privateKey = key;
        this.session = new GCMSession(key, nonce);

        // pass the state check, so assert is safe.
        // client change channel after send `PubKeyC2SPacket`
        const bus = this.server.networkBus as ServerEncryptNetBus;
        const channel = new EncryptSessionChannel(bus, this.session, this.connection.sid);
        this.connection.channelActive(channel);
        this.connection.setInbound(NegotiateProtocols.CLIENT_BOUND, this);
        this.connection.setOutBound(NegotiateProtocols.SERVER_BOUND);

        this.state = NegotiateState.SESSION_ENCRYPTED;
        console.log(`Channel "${this.connection.sid}" encrypted`, this.profile.toString());

        if (!ServerProperties.PLAYER_VERIFY.get()) {
            this.state = NegotiateState.ATTEMPT_LOGIN;
            void this.finishLogin();
            return;
        }

        this.send(RequireLoginS2CPacket.INSTANCE);
    }

    public async onClientLogin(packet: LoginC2SPacket) {
        if (this.isInvalid(NegotiateState.SESSION_ENCRYPTED)) return;
        this.state = NegotiateState.ATTEMPT_LOGIN;

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
                console.log(`Player "${this.profile.name}" login with passkey`);
                void this.finishLogin();
                break;
            case LoginResult.INVALID_KEY:
                this.disconnect(INVALID_KEY);
                break;
            case LoginResult.UNMATCH_PASSKEY:
                this.disconnect(UNMATCH_PASSKEY);
                break;
            case LoginResult.INTERNAL_ERROR:
                this.disconnect(ServerNegotiateHandler.INTERNAL_ERROR);
                break;
            default:
                this.disconnect(ServerNegotiateHandler.INVALID_STATE);
                break;
        }
    }

    private async finishLogin() {
        if (this.isInvalid(NegotiateState.ATTEMPT_LOGIN)) return;

        const key = this.privateKey;
        const session = this.session;
        if (!key || !session || !this.group) {
            this.disconnect(ServerNegotiateHandler.INVALID_STATE);
            return;
        }
        this.privateKey = null;
        this.session = null;

        const iv = session.nonce();
        const wrappered = await wrapKey(key, iv, this.group);
        this.state = NegotiateState.LOGIN;

        // success login, send group key now.
        this.send(new GroupKeyS2CPacket(new Uint8Array(wrappered), iv));
    }

    public onClientFinishNegotiate() {
        if (this.isInvalid(NegotiateState.LOGIN)) return;
        this.state = NegotiateState.PROTOCOL_SWITCHING;
        // here got two branch, encrypted nor not, so must announce client finish.
        this.send(ServerAllowConfigS2CPacket.INSTANCE);
    }

    public onClientPromoteToConfig(_: ClientStartConfigC2SPacket) {
        if (this.isInvalid(NegotiateState.PROTOCOL_SWITCHING)) return;

        const config = new ServerConfigHandler(this.server, this.connection, this.profile);
        this.connection.cleanReceived();
        this.connection.setInbound(ConfigProtocols.CLIENT_BOUND, config);
        this.connection.setOutBound(ConfigProtocols.SERVER_BOUND);
        this.state = NegotiateState.FINISH;
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
    SESSION_ENCRYPTED,
    ATTEMPT_LOGIN,
    LOGIN,
    PROTOCOL_SWITCHING,
    FINISH,
    CANCEL,
}