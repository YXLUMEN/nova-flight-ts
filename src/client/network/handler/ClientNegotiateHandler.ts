import type {ServerAllowConfigS2CPacket} from "../../../network/packet/negotiate/ServerAllowConfigS2CPacket.ts";
import type {PubKeyS2CPacket} from "../../../network/packet/negotiate/PubKeyS2CPacket.ts";
import type {GroupKeyS2CPacket} from "../../../network/packet/negotiate/GroupKeyS2CPacket.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {ClientConnection} from "../ClientConnection.ts";
import {ClientCommonHandler} from "./ClientCommonHandler.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";
import {SessionKeyGenerator} from "../../../network/crypto/SessionKeyGenerator.ts";
import {PubKeyC2SPacket} from "../../../network/packet/negotiate/PubKeyC2SPacket.ts";
import {CryptoHelper} from "../../../network/crypto/CryptoHelper.ts";
import {ClientFinishNegC2SPacket} from "../../../network/packet/negotiate/ClientFinishNegC2SPacket.ts";
import {ClientConfigHandler} from "./ClientConfigHandler.ts";
import {ConfigProtocols} from "../../../network/protocol/ConfigProtocols.ts";
import {ClientEncryptChannel} from "../channel/ClientEncryptChannel.ts";
import {ClientStartConfigC2SPacket} from "../../../network/packet/negotiate/ClientStartConfigC2SPacket.ts";

export class ClientNegotiateHandler extends ClientCommonHandler {
    private isEncrypt = false;
    private group: CryptoHelper | null = null;
    private session: CryptoHelper | null = null;

    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        super(client, connection, ConnectionState.NEGOTIATION);
    }

    public async onServerPubKey(packet: PubKeyS2CPacket) {
        this.isEncrypt = true;

        const generator = new SessionKeyGenerator();
        await generator.generateKey();

        const pubKey = await generator.pubKey();
        const peer = await generator.importPeer(packet.pubKey);
        const info = await SessionKeyGenerator.genInfo(packet.pubKey, pubKey);
        const key = await generator.derivePrivate(
            peer,
            packet.salt,
            info,
            ['unwrapKey', 'encrypt', 'decrypt']
        );
        this.session = new CryptoHelper(key);

        this.send(new PubKeyC2SPacket(new Uint8Array(pubKey)));
    }

    public async onGroup(packet: GroupKeyS2CPacket) {
        if (!this.session) throw new Error();

        const groupKey = await this.session.unwrapKey(packet.iv, packet.wrappered);
        this.group = new CryptoHelper(groupKey);
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