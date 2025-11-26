import {clamp, PI2} from "./math/math.ts";

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

export function hexToArgbInt(hex: string): number {
    let clean = hex.replace('#', '').trim();
    if (clean.length === 6) {
        clean = `${clean}FF`;
    } else if (clean.length !== 8) {
        throw new Error('Expected #RRGGBB or #RRGGBBAA');
    }

    const result = parseInt(clean, 16);

    if (isNaN(result)) {
        throw new Error('Invalid hexadecimal string');
    }

    return result;
}

export function argbIntToHex(colorInt: number): string {
    const hexString = (colorInt >>> 0).toString(16).padStart(8, '0').toUpperCase();
    return `#${hexString}`;
}