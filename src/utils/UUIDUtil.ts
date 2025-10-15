import type {UUID} from "../apis/registry.ts";

export class UUIDUtil {
    public static readonly EMPTY_UUID = new Uint8Array(16);

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

    public static isValidUUID(uuid: string): uuid is UUID {
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        return uuidRegex.test(uuid);
    }

    public static nil(): Uint8Array {
        return new Uint8Array(16);
    }
}
