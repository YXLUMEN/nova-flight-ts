/** nonce 长度,勿随意调整 */
export const GCM_NONCE_BYTES = 12;

export function encrypt(key: CryptoKey, iv: BufferSource, data: BufferSource) {
    return crypto.subtle.encrypt(
        {name: 'AES-GCM', iv},
        key,
        data,
    );
}

export function decrypt(key: CryptoKey, iv: BufferSource, ciphertext: BufferSource) {
    return crypto.subtle.decrypt(
        {name: 'AES-GCM', iv},
        key,
        ciphertext,
    );
}

export function wrapKey(wrappingKey: CryptoKey, iv: BufferSource, key: CryptoKey) {
    return crypto.subtle.wrapKey(
        'raw',
        key,
        wrappingKey,
        {name: 'AES-GCM', iv},
    );
}

export function unwrapKey(
    unwrappingKey: CryptoKey,
    iv: BufferSource,
    wrappedKey: BufferSource,
    keyUsages: Iterable<KeyUsage>,
) {
    return crypto.subtle.unwrapKey(
        'raw',
        wrappedKey,
        unwrappingKey,
        {name: 'AES-GCM', iv},
        {name: 'AES-GCM', length: 256},
        false,
        keyUsages,
    );
}

export function randomIv() {
    return crypto.getRandomValues(new Uint8Array(GCM_NONCE_BYTES));
}

export function exportECDHTpPEM(raw: ArrayBuffer) {
    const base64String = new Uint8Array(raw).toBase64({alphabet: 'base64url'});
    const matches = base64String.match(/.{1,64}/g);
    const pemLines = matches === null ? base64String : matches.join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${pemLines}\n-----END PUBLIC KEY-----\n`;
}