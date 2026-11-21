import type {Payload} from "../../../network/Payload.ts";
import type {ProtocolInfo} from "../../../network/protocol/ProtocolInfo.ts";
import type {GameProfile} from "../../entity/GameProfile.ts";
import type {EncryptEgress} from "./EncryptEgress.ts";
import {type GCMEncrypt, GCMEncryptImpl} from "../../../network/crypto/GCMEncrypt.ts";
import {genGroupKey} from "../../../network/crypto/GCMHelper.ts";
import {GCMScope} from "../../../network/crypto/GCMScope.ts";
import {WebSocketBus} from "../../../network/WebSocketBus.ts";
import {ServerNetworkBus} from "./ServerNetworkBus.ts";
import {ECDHKeyAgreement} from "../../../network/crypto/ECDHKeyAgreement.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {Log} from "../../../worker/log.ts";
import {NonceGenerator} from "../../../network/crypto/NonceGenerator.ts";
import {NonceExhaustedError} from "../../../type/errors.ts";

export class ServerEncryptNetBus extends ServerNetworkBus implements EncryptEgress {
    protected override readonly batchSize = WebSocketBus.MAX_ESTIMATE - 28;

    public readonly agreement = new ECDHKeyAgreement();
    private group: GCMEncrypt | null = null;
    private groupKey: CryptoKey | null = null;

    private tail = Promise.resolve();

    public async init() {
        await this.agreement.generate();
        await this.freshGroupKey();
    }

    public async freshGroupKey() {
        const groupKey = await genGroupKey();
        const nonce = new NonceGenerator(GCMScope.S_GROUP);
        this.group = new GCMEncryptImpl(groupKey, nonce);
        this.groupKey = groupKey;
    }

    public override broadWith(payload: Payload, protocol: ProtocolInfo) {
        if (this.group!.exhausted()) {
            // TODO 轮换
            throw new NonceExhaustedError();
        }

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 32); // 4 + iv + tag
        protocol.codec.encode(writer, payload);

        this.thenSend(this.encrypt(this.group!, writer, protocol.protocol));
    }

    public override exclude(payload: Payload, ...excludes: GameProfile[]) {
        if (this.group!.exhausted()) {
            throw new NonceExhaustedError();
        }

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 33 + excludes.length);
        this.out.codec.encode(writer, payload);

        this.thenSend(this.encryptExclude(this.group!, writer, this.out.protocol, excludes));
    }

    public thenSend(task: Promise<Uint8Array<ArrayBuffer>>) {
        const next = this.tail.then(async () => {
            const buffer = await task;
            if (this.isConnected()) this.send(buffer);
        });
        this.tail = next.catch(err => Log.error(err));
    }

    private async encrypt(encrypt: GCMEncrypt, writer: BinaryWriter, protocol: number) {
        const nonce = encrypt.nonce();
        const encrypted = await encrypt.encrypt(nonce, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.SERVER_BROADCAST);
        writer.writeInt8(protocol);
        writer.pushBytes(nonce);
        writer.pushBytes(encrypted);
        return writer.toUint8Array();
    }

    private async encryptExclude(
        encrypt: GCMEncrypt,
        writer: BinaryWriter,
        protocol: number,
        excludes: GameProfile[]
    ) {
        const nonce = encrypt.nonce();
        const encrypted = await encrypt.encrypt(nonce, writer.toUint8Array());
        writer.reset();

        writer.writeInt8(PacketHeader.SERVER_EXCLUDE);
        writer.writeInt8(protocol);

        writer.writeVarUint(excludes.length);
        for (const session of excludes) {
            writer.writeInt8(session.sessionId);
        }

        writer.pushBytes(nonce);
        writer.pushBytes(encrypted);
        return writer.toUint8Array();
    }

    public getGroupKey() {
        return this.groupKey;
    }
}