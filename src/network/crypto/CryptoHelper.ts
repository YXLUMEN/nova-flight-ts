import {IllegalArgumentError} from "../../type/errors.ts";

export class CryptoHelper {
    public readonly ivLength: number;
    private readonly key: CryptoKey;

    public constructor(key: CryptoKey, ivLength: number = 12) {
        this.key = key;
        this.ivLength = ivLength;
    }

    public encrypt(
        iv: BufferSource,
        data: BufferSource,
    ) {
        return crypto.subtle.encrypt(
            {name: 'AES-GCM', iv},
            this.key,
            data,
        );
    }

    public decrypt(
        iv: Uint8Array<ArrayBuffer>,
        ciphertext: BufferSource,
    ) {
        if (iv.length !== this.ivLength) {
            throw new IllegalArgumentError();
        }

        return crypto.subtle.decrypt(
            {name: 'AES-GCM', iv},
            this.key,
            ciphertext,
        );
    }

    public wrapKey(iv: BufferSource, key: CryptoKey) {
        return crypto.subtle.wrapKey(
            'raw',
            key,
            this.key,
            {name: 'AES-GCM', iv},
        );
    }

    public unwrapKey(
        iv: Uint8Array<ArrayBuffer>,
        wrappedKey: Uint8Array<ArrayBuffer>,
    ) {
        if (iv.length !== this.ivLength) {
            throw new IllegalArgumentError();
        }

        return crypto.subtle.unwrapKey(
            'raw',
            wrappedKey,
            this.key,
            {name: 'AES-GCM', iv},
            {name: 'AES-GCM', length: 256},
            false,
            ['decrypt'],
        );
    }

    public iv() {
        return crypto.getRandomValues(new Uint8Array(this.ivLength));
    }
}