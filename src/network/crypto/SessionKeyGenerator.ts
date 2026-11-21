import {IllegalStateError} from "../../type/errors.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class SessionKeyGenerator {
    private self: CryptoKeyPair | null = null;
    private pubCache: ArrayBuffer | null = null;

    public async generateKey() {
        if (this.self) throw new IllegalStateError('Already gen key pair');
        this.self = await crypto.subtle.generateKey(
            {name: 'ECDH', namedCurve: 'P-256'},
            false,
            ['deriveBits'],
        );
    }

    public async pubKey() {
        if (!this.self) throw new IllegalStateError('Missing key pair');
        return this.pubCache ??= await crypto.subtle.exportKey('spki', this.self.publicKey);
    }

    public importPeer(pubKey: Uint8Array<ArrayBuffer>) {
        return crypto.subtle.importKey(
            'spki',
            pubKey,
            {name: 'ECDH', namedCurve: 'P-256'},
            false,
            [],
        );
    }

    public async derivePrivate(
        peerPub: CryptoKey,
        salt: Uint8Array<ArrayBuffer>,
        info: Uint8Array<ArrayBuffer>,
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

    public static async genInfo(pubA: Uint8Array<ArrayBuffer> | ArrayBuffer, pubB: Uint8Array<ArrayBuffer> | ArrayBuffer) {
        const writer = new BinaryWriter(1 + pubA.byteLength + pubB.byteLength);
        writer.writeInt8(51);
        writer.pushBytes(pubA);
        writer.pushBytes(pubB);
        const hash = await crypto.subtle.digest("SHA-256", writer.toUint8Array());
        return new Uint8Array(hash);
    }
}