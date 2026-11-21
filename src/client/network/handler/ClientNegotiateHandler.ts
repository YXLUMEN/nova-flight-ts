import type {ServerAllowConfigS2CPacket} from "../../../network/packet/negotiate/ServerAllowConfigS2CPacket.ts";
import type {PubKeyS2CPacket} from "../../../network/packet/negotiate/PubKeyS2CPacket.ts";
import type {GroupKeyS2CPacket} from "../../../network/packet/negotiate/GroupKeyS2CPacket.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import {unwrapKey} from "../../../network/crypto/GCMHelper.ts";
import {type GCMDecrypt, GCMDecryptImpl} from "../../../network/crypto/GCMDecrypt.ts";
import {GCMScope} from "../../../network/crypto/GCMScope.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import {ECDHKeyAgreement} from "../../../network/crypto/ECDHKeyAgreement.ts";
import {PubKeyC2SPacket} from "../../../network/packet/negotiate/PubKeyC2SPacket.ts";
import {ClientFinishNegC2SPacket} from "../../../network/packet/negotiate/ClientFinishNegC2SPacket.ts";
import {ClientConfigHandler} from "./ClientConfigHandler.ts";
import {ConfigProtocols} from "../../../network/protocol/ConfigProtocols.ts";
import {ClientEncryptChannel} from "../channel/ClientEncryptChannel.ts";
import {ClientStartConfigC2SPacket} from "../../../network/packet/negotiate/ClientStartConfigC2SPacket.ts";
import {NonceGenerator} from "../../../network/crypto/NonceGenerator.ts";
import {GCMSession} from "../../../network/crypto/GCMSession.ts";

export class ClientNegotiateHandler extends ClientCommonHandler {
    private isEncrypt = false;
    private group: GCMDecrypt | null = null;
    private session: GCMSession | null = null;
    private sessionKey: CryptoKey | null = null;

    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.NEGOTIATION);
    }

    public async onServerPubKey(packet: PubKeyS2CPacket) {
        this.isEncrypt = true;

        const generator = new ECDHKeyAgreement();
        await generator.generate();

        const pubKey = await generator.publicKey();
        const peer = await generator.importPublicKey(packet.pubKey);
        const info = await ECDHKeyAgreement.transcriptInfo(packet.pubKey, pubKey);
        const key = await generator.deriveKey(
            peer,
            packet.salt,
            info,
            ['unwrapKey', 'encrypt', 'decrypt']
        );

        const nonce = new NonceGenerator(GCMScope.C_SESSION);
        this.session = new GCMSession(key, nonce);
        this.sessionKey = key;

        this.send(new PubKeyC2SPacket(new Uint8Array(pubKey)));
    }

    public async onGroup(packet: GroupKeyS2CPacket) {
        this.isEncrypt = true;
        if (!this.sessionKey) throw new Error('Session did not init');

        const groupKey = await unwrapKey(this.sessionKey, packet.iv, packet.wrappered, ['decrypt']);
        this.group = new GCMDecryptImpl(groupKey);
        this.send(ClientFinishNegC2SPacket.INSTANCE);
    }

    public onAllowConfig(_: ServerAllowConfigS2CPacket) {
        this.send(ClientStartConfigC2SPacket.INSTANCE);

        if (this.isEncrypt) {
            if (!this.group || !this.session) throw new Error('Negotiate fail');
            const channel = new ClientEncryptChannel(this.group, this.session);
            this.client.setChannel(channel);
        }

        const config = new ClientConfigHandler(this.client, this.connection);
        this.connection.setInbound(ConfigProtocols.SERVER_BOUND, config);
        this.connection.setOutBound(ConfigProtocols.CLIENT_BOUND);
    }
}