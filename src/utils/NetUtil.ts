import {clamp, PI2} from "./math/math.ts";
import type {Entity} from "../entity/Entity.ts";
import {Registries} from "../registry/Registries.ts";

const VELOCITY_SCALE = 32767 / 60.0;

export function encodeYaw(yawRad: number): number {
    const normalized = ((yawRad % PI2) + PI2) % PI2;
    return Math.floor(normalized * 256 / PI2);
}

export function decodeYaw(yawByte: number): number {
    return (yawByte & 0xFF) * PI2 / 256;
}

export function encodeVelocity(v: number): number {
    const clamped = clamp(v, -60, 60);
    return Math.round(clamped * VELOCITY_SCALE);
}

export function decodeVelocity(i: number): number {
    return i / VELOCITY_SCALE;
}

export function encodeToInt16(value: number, maxValue: number = 20): number {
    const clamped = clamp(value, -maxValue, maxValue);
    return Math.round(clamped * (32767 / maxValue));
}

export function decodeFromInt16(value: number, maxValue: number = 20): number {
    return value * (maxValue / 32767);
}

export function encodeToByte(value: number, maxValue: number = 5): number {
    const clamped = clamp(value, -maxValue, maxValue);
    return Math.round(clamped * (127 / maxValue));
}

export function decodeFromByte(value: number, maxValue: number = 5): number {
    return value * (maxValue / 127);
}

export function encodeToUnsignedByte(value: number, maxValue: number = 10): number {
    const clamped = clamp(value, 0, maxValue);
    return Math.round(clamped * (255 / maxValue));
}

export function decodeFromUnsignedByte(value: number, maxValue: number = 10): number {
    return value * (maxValue / 255);
}

export function encodeColorHex(hex: string): number {
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        clean += clean + 'FF';
    } else if (clean.length === 6) {
        clean = `${clean}FF`;
    } else if (clean.length !== 8) {
        throw new Error(`Expected #RRGGBB or #RRGGBBAA not: ${hex}`);
    }

    const result = parseInt(clean, 16);
    if (isNaN(result)) {
        throw new Error('Invalid hexadecimal string');
    }

    return result;
}

export function decodeColorHex(colorInt: number): string {
    const hexString = (colorInt >>> 0).toString(16).padStart(8, '0').toUpperCase();
    return `#${hexString}`;
}

export function estimateEntitySpawnPacketSize(entity: Entity, ownerId: number = 0): number {
    let size = 1;

    // entityId (VarInt)
    size += getVarIntSize(entity.getId());

    // uuid (16 bytes)
    size += 16;

    // x, y (assume double = 8 bytes each)
    size += 16;

    // yaw (byte)
    size += 1;

    // entityType: Identifier.of("namespace:path") → serialized as VarInt-prefixed UTF-8 string
    const typeStr = Registries.ENTITY_TYPE.getId(entity.getType())!.toString();
    size += getVarIntSize(typeStr.length) + typeStr.length;

    // vx, vy Uint16
    size += 4;

    // color & edgeColor: rgbaInt Uint32
    size += 8;

    // ownerId (VarInt)
    size += getVarIntSize(ownerId);

    return size;
}

export function getVarIntSize(value: number): number {
    let size = 0;
    do {
        value >>>= 7;
        size++;
    } while (value !== 0);
    return size;
}

// U32
export function varUintSize(value: number): number {
    if (value < 1 << 7) return 1;
    if (value < 1 << 14) return 2;
    if (value < 1 << 21) return 3;
    if (value < 1 << 28) return 4;
    return 5;
}

/**
 * It assumes that the input is a valid UTF-16 string (i.e., surrogate pairs are correctly paired).
 * */
export function utf8ByteLength(str: string): number {
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);

        if (code < 0x80) {
            bytes += 1; // ASCII
        } else if (code < 0x800) {
            bytes += 2; // 2-byte UTF-8
        } else if (code < 0xD800 || code >= 0xE000) {
            bytes += 3; // 3-byte UTF-8 (BMP non-surrogate)
        } else {
            // Surrogate pair (for code points >= U+10000)
            // Skip the low surrogate
            i++;
            bytes += 4; // 4-byte UTF-8
        }
    }
    return bytes;
}