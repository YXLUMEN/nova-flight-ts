import {IllegalArgumentError} from "../../type/errors.ts";
import {decrypt} from "./GCMHelper.ts";

export interface GCMDecrypt {
    decrypt(nonce: BufferSource, ciphertext: BufferSource): Promise<ArrayBuffer>;
}

export class GCMDecryptImpl implements GCMDecrypt {
    private readonly key: CryptoKey;

    public constructor(key: CryptoKey) {
        if (key.usages.every(v => v !== 'decrypt')) {
            throw new IllegalArgumentError('key can not use to decrypt');
        }
        this.key = key;
    }

    public decrypt(nonce: BufferSource, ciphertext: BufferSource) {
        return decrypt(this.key, nonce, ciphertext);
    }
}