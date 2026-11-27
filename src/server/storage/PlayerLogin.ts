import type {UUID} from "../../type/types.ts";
import {IndexedDBHelper} from "../../database/IndexedDBHelper.ts";
import {Result} from "../../utils/result/Result.ts";
import {constantTimeEqual} from "../../utils/collection/equal.ts";
import {Log} from "../../utils/Log.ts";

export class PlayerLogin {
    public static readonly PASSKEY_LEN = 32;

    private readonly db: IndexedDBHelper;
    private readonly uuid: UUID;

    public constructor(db: IndexedDBHelper, uuid: UUID) {
        this.db = db;
        this.uuid = uuid;
    }

    public async login(input: Uint8Array<ArrayBuffer>): Promise<LoginResult> {
        if (!PlayerLogin.validatePasskey(input)) return LoginResult.INVALID_KEY;

        // get exist passkey hash
        const result = await this.db.get<KeyRecord>('account', this.uuid);
        if (result.isErr()) {
            Log.error(result.unwrapErr());
            return LoginResult.INTERNAL_ERROR;
        }

        const record = result.unwrap();
        if (!record) return LoginResult.NOT_REGISTRY;

        const inputHash = await crypto.subtle.digest('SHA-256', input);
        return constantTimeEqual(new Uint8Array(record.hash), new Uint8Array(inputHash)) ?
            LoginResult.LOGIN_SUCCESS :
            LoginResult.UNMATCH_PASSKEY;
    }

    public async registry(input: Uint8Array<ArrayBuffer>): Promise<LoginResult> {
        if (!PlayerLogin.validatePasskey(input)) return LoginResult.INVALID_KEY;

        const uuid = this.uuid;
        const inputHash = await crypto.subtle.digest('SHA-256', input);

        const db = await this.db.init();
        const tx = db.transaction('account', 'readwrite');
        const store = tx.objectStore('account');

        // get exist passkey hash
        const existTask = new Promise<Result<KeyRecord | null, Error>>(resolve => {
            const request = store.get(uuid);
            request.onsuccess = () => resolve(Result.ok(request.result ?? null));
            request.onerror = () => resolve(this.db.mapErr(request.error));
        });

        const exist = await existTask;
        if (exist.isErr()) {
            Log.error(exist.unwrapErr());
            return LoginResult.INTERNAL_ERROR;
        }

        // key is exist, try login again
        const record = exist.unwrap();
        if (record) {
            return constantTimeEqual(new Uint8Array(record.hash), new Uint8Array(inputHash)) ?
                LoginResult.LOGIN_SUCCESS :
                LoginResult.UNMATCH_PASSKEY;
        }

        // registry this uuid
        const registry = new Promise<Result<void, Error>>(resolve => {
            const request = store.put({uuid, hash: inputHash});
            request.onsuccess = () => resolve(Result.ok(undefined));
            request.onerror = () => resolve(Result.err(Result.mapErr(request.error)));
        });

        const result = await registry;
        if (result.isErr()) {
            tx.abort();
            Log.error(result.unwrapErr());
            return LoginResult.INTERNAL_ERROR;
        }
        return LoginResult.LOGIN_SUCCESS;
    }

    public static unRegistry(db: IndexedDBHelper, uuid: UUID) {
        return db.delete('account', uuid);
    }

    public static validatePasskey(key: unknown): boolean {
        if (key instanceof Uint8Array) {
            return key.length === PlayerLogin.PASSKEY_LEN;
        }
        return false;
    }
}

export const enum LoginResult {
    LOGIN_SUCCESS,
    UNMATCH_PASSKEY,
    INVALID_KEY,
    NOT_REGISTRY,
    INTERNAL_ERROR,
}

interface KeyRecord {
    uuid: UUID;
    hash: ArrayBuffer;
}