import type {NonceGenerator} from "./NonceGenerator.ts";
import type {GCMEncrypt} from "./GCMEncrypt.ts";
import type {GCMDecrypt} from "./GCMDecrypt.ts";
import {decrypt, encrypt} from "./GCMHelper.ts";

export class GCMSession implements GCMEncrypt, GCMDecrypt {
    private readonly key: CryptoKey;
    private readonly gen: NonceGenerator;

    public constructor(key: CryptoKey, gen: NonceGenerator) {
        this.key = key;
        this.gen = gen;
    }

    public encrypt(nonce: BufferSource, data: BufferSource) {
        return encrypt(this.key, nonce, data);
    }

    public decrypt(nonce: BufferSource, ciphertext: BufferSource) {
        return decrypt(this.key, nonce, ciphertext);
    }

    public nonce() {
        return this.gen.next();
    }

    public exhausted(): boolean {
        return this.gen.isExhausted();
    }
}