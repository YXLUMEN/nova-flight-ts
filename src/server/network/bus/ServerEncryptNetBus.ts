import type {Payload} from "../../../network/Payload.ts";
import type {GameProfile} from "../../entity/GameProfile.ts";
import type {EncryptEgress} from "./EncryptEgress.ts";
import type {SocketAddr} from "../../../network/SocketAddr.ts";
import {buildEncrypt, buildExcludes} from "../../../network/FrameUtil.ts";
import {type GCMEncrypt, GCMEncryptImpl} from "../../../network/crypto/GCMEncrypt.ts";
import {GCMScope} from "../../../network/crypto/GCMScope.ts";
import {WebSocketBus} from "../../../network/WebSocketBus.ts";
import {ServerNetworkBus} from "./ServerNetworkBus.ts";
import {ECDHKeyAgreement} from "../../../network/crypto/ECDHKeyAgreement.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {Log} from "../../../utils/Log.ts";
import {NonceGenerator} from "../../../network/crypto/NonceGenerator.ts";
import {NonceExhaustedError} from "../../../type/errors.ts";

export class ServerEncryptNetBus extends ServerNetworkBus implements EncryptEgress {
    protected override readonly batchSize = WebSocketBus.MAX_ESTIMATE - 28;

    public readonly agreement = new ECDHKeyAgreement();
    private group: GCMEncrypt | null = null;
    private groupKey: CryptoKey | null = null;

    // 保证发送顺序为调用顺序,与同步逻辑一致
    private tail = Promise.resolve();

    public constructor(address: SocketAddr, secretKey: Uint8Array) {
        super(address, secretKey);
        this.report = this.report.bind(this);
    }

    public async init() {
        await this.agreement.generate();
        await this.freshGroupKey();
    }

    public async freshGroupKey() {
        const groupKey = await this.genGroupKey();
        const nonce = new NonceGenerator(GCMScope.S_GROUP);
        this.group = new GCMEncryptImpl(groupKey, nonce);
        this.groupKey = groupKey;
    }

    public override broadcast(payload: Payload) {
        if (this.group!.exhausted()) {
            throw new NonceExhaustedError();
        }

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 32); // 4 + iv + tag
        this.out.encode(writer, payload);
        this.thenSend(buildEncrypt(this.group!, writer, PacketHeader.SERVER_BROADCAST, 0));
    }

    public override exclude(payload: Payload, ...excludes: GameProfile[]) {
        if (this.group!.exhausted()) {
            throw new NonceExhaustedError();
        }

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 33 + excludes.length);
        this.out.encode(writer, payload);
        this.thenSend(this.encryptExclude(this.group!, writer, excludes));
    }

    public thenSend(task: Promise<Uint8Array<ArrayBuffer>>) {
        const next = this.tail.then(async () => {
            const buffer = await task;
            if (this.isConnected()) this.send(buffer);
        });
        this.tail = next.catch(this.report);
    }

    private report(err: unknown) {
        // 错误处理
        Log.error(err);
    }

    private async encryptExclude(
        encrypt: GCMEncrypt,
        writer: BinaryWriter,
        excludes: GameProfile[]
    ) {
        const nonce = encrypt.nonce();
        const encrypted = await encrypt.encrypt(nonce, writer.toUint8Array());
        writer.reset();

        buildExcludes(writer, excludes);
        writer.pushBytes(nonce);
        writer.pushBytes(encrypted);
        return writer.toUint8Array();
    }

    public getGroupKey() {
        return this.groupKey;
    }

    private genGroupKey() {
        return crypto.subtle.generateKey(
            {name: 'AES-GCM', length: 256},
            true,
            ['encrypt'],
        );
    }
}