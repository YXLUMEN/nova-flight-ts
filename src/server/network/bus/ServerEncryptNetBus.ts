import type {Payload} from "../../../network/Payload.ts";
import type {ProtocolInfo} from "../../../network/protocol/ProtocolInfo.ts";
import type {GameProfile} from "../../entity/GameProfile.ts";
import type {EncryptEgress} from "./EncryptEgress.ts";
import {WebSocketBus} from "../../../network/WebSocketBus.ts";
import {ServerNetworkBus} from "./ServerNetworkBus.ts";
import {SessionKeyGenerator} from "../../../network/crypto/SessionKeyGenerator.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {CryptoHelper} from "../../../network/crypto/CryptoHelper.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {Log} from "../../../worker/log.ts";

export class ServerEncryptNetBus extends ServerNetworkBus implements EncryptEgress {
    protected override readonly batchSize = WebSocketBus.MAX_ESTIMATE - 28;

    public readonly serverSession = new SessionKeyGenerator();
    private crypto: CryptoHelper = null!;
    private groupKey: CryptoKey | null = null;
    private tail = Promise.resolve();

    public async init() {
        if (this.crypto) return;

        const groupKey = await crypto.subtle.generateKey(
            {name: 'AES-GCM', length: 256},
            true,
            ['encrypt', 'decrypt'],
        );
        this.groupKey = groupKey;
        this.crypto = new CryptoHelper(groupKey);
        await this.serverSession.generateKey();
    }

    public getGroupKey() {
        return this.groupKey;
    }

    public override broadWith(payload: Payload, protocol: ProtocolInfo) {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 32); // 4 + iv + tag
        protocol.codec.encode(writer, payload);
        this.thenSend(this.encrypt(writer, protocol.protocol));
    }

    public override exclude(payload: Payload, ...excludes: GameProfile[]) {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 33 + excludes.length);
        this.out.codec.encode(writer, payload);
        this.thenSend(this.encryptExclude(writer, this.out.protocol, excludes));
    }

    public thenSend(task: Promise<Uint8Array<ArrayBuffer>>) {
        const next = this.tail.then(async () => {
            const buffer = await task;
            if (this.isConnected()) this.send(buffer);
        });
        this.tail = next.catch(err => Log.error(err));
    }

    private async encrypt(writer: BinaryWriter, protocol: number) {
        const iv = this.crypto.iv();
        const task = await this.crypto.encrypt(iv, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.SERVER_BROADCAST);
        writer.writeInt8(protocol);
        writer.pushBytes(iv);
        writer.pushBytes(task);
        return writer.toUint8Array();
    }

    private async encryptExclude(writer: BinaryWriter, protocol: number, excludes: GameProfile[]) {
        const iv = this.crypto.iv();
        const task = await this.crypto.encrypt(iv, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.SERVER_EXCLUDE);
        writer.writeInt8(protocol);

        writer.writeVarUint(excludes.length);
        for (const session of excludes) {
            writer.writeInt8(session.sessionId);
        }

        writer.pushBytes(iv);
        writer.pushBytes(task);
        return writer.toUint8Array();
    }
}