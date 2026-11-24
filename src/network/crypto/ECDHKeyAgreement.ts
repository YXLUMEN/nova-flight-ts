import {IllegalStateError} from "../../type/errors.ts";
import {BinaryWriter, type ByteSource} from "../../serialization/BinaryWriter.ts";

export class ECDHKeyAgreement {
    private self: CryptoKeyPair | null = null;
    private pubCache: ArrayBuffer | null = null;

    /** 生成新的密钥对 */
    public async generate() {
        if (this.self) throw new IllegalStateError('Already gen key pair');
        this.self = await crypto.subtle.generateKey(
            {name: 'ECDH', namedCurve: 'P-256'},
            false,
            ['deriveBits'],
        );
        this.pubCache = null;
    }

    public async publicKey() {
        if (!this.self) throw new IllegalStateError('Missing key pair');
        return this.pubCache ??= await crypto.subtle.exportKey('spki', this.self.publicKey);
    }

    public importPublicKey(pubKey: ByteSource) {
        return crypto.subtle.importKey(
            'spki',
            pubKey,
            {name: 'ECDH', namedCurve: 'P-256'},
            false,
            [],
        );
    }

    public async deriveKey(
        peerPub: CryptoKey,
        salt: ByteSource,
        info: ByteSource,
        usages: KeyUsage[]
    ) {
        if (!this.self) throw new IllegalStateError();

        const subtle = crypto.subtle;

        const sharedSecret = await subtle.deriveBits(
            {name: 'ECDH', public: peerPub},
            this.self.privateKey,
            256,
        );

        const hkdfKey = await subtle.importKey(
            'raw',
            sharedSecret,
            'HKDF',
            false,
            ['deriveKey'],
        );

        return await subtle.deriveKey(
            {name: 'HKDF', hash: 'SHA-256', salt, info},
            hkdfKey,
            {name: 'AES-GCM', length: 256},
            false,
            usages,
        );
    }

    public static async transcriptInfo(pubA: ByteSource, pubB: ByteSource) {
        const writer = new BinaryWriter(2 + pubA.byteLength + pubB.byteLength);
        writer.writeInt16(0x6e66); // nf utf-8 hex
        writer.pushBytes(pubA);
        writer.pushBytes(pubB);
        const hash = await crypto.subtle.digest('SHA-256', writer.toUint8Array());
        return new Uint8Array(hash);
    }
}