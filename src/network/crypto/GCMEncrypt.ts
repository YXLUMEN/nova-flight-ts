import type {NonceGenerator} from "./NonceGenerator.ts";
import {encrypt} from "./GCMHelper.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export interface GCMEncrypt {
    encrypt(nonce: BufferSource, data: BufferSource): Promise<ArrayBuffer>;

    nonce(): Uint8Array<ArrayBuffer>;

    exhausted(): boolean;
}

export class GCMEncryptImpl implements GCMEncrypt {
    private readonly key: CryptoKey;
    private readonly gen: NonceGenerator;

    public constructor(key: CryptoKey, gen: NonceGenerator) {
        if (key.usages.every(v => v !== 'encrypt')) {
            throw new IllegalArgumentError('key can not use to encrypt');
        }
        this.key = key;
        this.gen = gen;
    }

    public encrypt(nonce: BufferSource, data: BufferSource) {
        return encrypt(this.key, nonce, data);
    }

    public nonce() {
        return this.gen.next();
    }

    public exhausted(): boolean {
        return this.gen.isExhausted();
    }
}