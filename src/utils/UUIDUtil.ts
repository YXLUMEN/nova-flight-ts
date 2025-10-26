import type {UUID} from "../apis/types.ts";

export class UUIDUtil {
    public static readonly EMPTY_UUID = new Uint8Array(16);
    public static readonly EMPTY_UUID_STRING = '0000-0000-0000-0000-0000';

    public static parse(uuid: string): Uint8Array {
        const hex = uuid.replace(/-/g, "");
        if (hex.length !== 32) {
            throw new Error("Invalid UUID");
        }
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    public static stringify(bytes: Uint8Array): UUID {
        if (bytes.length !== 16) {
            throw new Error("Invalid UUID bytes");
        }
        let hex = "";
        for (let i = 0; i < 16; i++) {
            hex += bytes[i].toString(16).padStart(2, "0");
        }

        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    public static async uuidFromUsername(username: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(username);

        const hashBuffer = await crypto.subtle.digest("SHA-1", data);
        const hash = new Uint8Array(hashBuffer);

        const bytes = hash.slice(0, 16);

        bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC4122

        return this.stringify(bytes);
    }

    public static isValidUUID(uuid: string): uuid is UUID {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(uuid);
    }

    public static nil(): Uint8Array {
        return new Uint8Array(16);
    }
}
