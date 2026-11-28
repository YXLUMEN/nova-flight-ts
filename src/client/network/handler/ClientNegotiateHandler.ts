import type {ServerAllowConfigS2CPacket} from "../../../network/packet/negotiate/ServerAllowConfigS2CPacket.ts";
import type {PubKeyS2CPacket} from "../../../network/packet/negotiate/PubKeyS2CPacket.ts";
import type {GroupKeyS2CPacket} from "../../../network/packet/negotiate/GroupKeyS2CPacket.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {RequireLoginS2CPacket} from "../../../network/packet/negotiate/RequireLoginS2CPacket.ts";
import type {UUID} from "../../../type/types.ts";
import {unwrapKey} from "../../../network/crypto/GCMHelper.ts";
import {GCMDecryptImpl} from "../../../network/crypto/GCMDecrypt.ts";
import {GCMScope} from "../../../network/crypto/GCMScope.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {ConnectionState} from "../../../network/ConnectionState.ts";
import {ECDHKeyAgreement} from "../../../network/crypto/ECDHKeyAgreement.ts";
import {PubKeyC2SPacket} from "../../../network/packet/negotiate/PubKeyC2SPacket.ts";
import {ClientFinishNegC2SPacket} from "../../../network/packet/negotiate/ClientFinishNegC2SPacket.ts";
import {ClientConfigHandler} from "./ClientConfigHandler.ts";
import {ConfigProtocols} from "../../../network/protocol/ConfigProtocols.ts";
import {ClientEncryptChannel} from "../channel/ClientEncryptChannel.ts";
import {ClientStartConfigC2SPacket} from "../../../network/packet/negotiate/ClientStartConfigC2SPacket.ts";
import {NonceGenerator} from "../../../network/crypto/NonceGenerator.ts";
import {GCMSession} from "../../../network/crypto/GCMSession.ts";
import {ClientStorage} from "../../storage/ClientStorage.ts";
import {LoginC2SPacket} from "../../../network/packet/negotiate/LoginC2SPacket.ts";
import {NegotiateProtocols} from "../../../network/protocol/NegotiateProtocols.ts";

export class ClientNegotiateHandler extends ClientCommonHandler {
    private encryptChannel: ClientEncryptChannel | null = null;
    private session: GCMSession | null = null;
    private privateKey: CryptoKey | null = null;

    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.NEGOTIATION);
    }

    public async onServerPubKey(packet: PubKeyS2CPacket) {
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
        this.privateKey = key;

        // current stage, send is immediately, will not use encrypt channel.
        this.send(new PubKeyC2SPacket(new Uint8Array(pubKey)));

        this.encryptChannel = new ClientEncryptChannel(this.client.getBus(), this.session);
        this.client.setChannel(this.encryptChannel);
        this.connection.setInbound(NegotiateProtocols.SERVER_BOUND, this);
        this.connection.setOutBound(NegotiateProtocols.CLIENT_BOUND);
    }

    public async onRequireLogin(_: RequireLoginS2CPacket) {
        const result = await ClientStorage.db.get<KeyRecord>('account', this.client.clientId);
        const record = result.unwrap();
        if (record) {
            this.send(new LoginC2SPacket(record.key));
            return;
        }

        const newKey = crypto.getRandomValues(new Uint8Array(32));
        const insertResult = await ClientStorage.db.add('account', {
            uuid: this.client.clientId,
            key: newKey,
        });
        insertResult.unwrap();
        this.send(new LoginC2SPacket(newKey));
    }

    public async onGroup(packet: GroupKeyS2CPacket) {
        if (!this.privateKey || !this.encryptChannel) {
            throw new Error('Session did not init');
        }

        const groupKey = await unwrapKey(this.privateKey, packet.iv, packet.wrappered, ['decrypt']);
        this.encryptChannel.setGroupKey(new GCMDecryptImpl(groupKey));
        this.send(ClientFinishNegC2SPacket.INSTANCE);
    }

    public onAllowConfig(_: ServerAllowConfigS2CPacket) {
        this.send(ClientStartConfigC2SPacket.INSTANCE);

        if (this.encryptChannel && !this.encryptChannel.available()) {
            throw new Error('Negotiate fail');
        }

        const config = new ClientConfigHandler(this.client, this.connection);
        this.connection.setInbound(ConfigProtocols.SERVER_BOUND, config);
        this.connection.setOutBound(ConfigProtocols.CLIENT_BOUND);
    }

    public override accept(payload: Payload) {
        if (!payload.inTransition?.()) return;
        super.accept(payload);
    }
}

interface KeyRecord {
    uuid: UUID;
    key: Uint8Array<ArrayBuffer>;
}