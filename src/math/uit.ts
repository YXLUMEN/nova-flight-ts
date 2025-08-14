import type {Vec2} from "./Vec2.ts";
import type {Entity} from "../entity/Entity.ts";

export const DPR = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export const collideCircle = (a: Entity, b: Entity) =>
    dist2(a.pos, b.pos) < (a.radius + b.radius) ** 2;

export function dist2(a: Vec2, b: Vec2) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function deepFreeze(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.getOwnPropertyNames(obj).forEach((key) => {
        const value = obj[key];

        if (
            typeof value === 'object' &&
            value !== null &&
            !Object.isFrozen(value)
        ) {
            deepFreeze(value);
        }
    });

    return Object.freeze(obj);
}

export function createCleanObj<T>(obj: T): T {
    return Object.assign(Object.create(null), obj);
}

export async function playSound(url: string): Promise<void> {
    try {
        const audioContext = new AudioContext();

        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.addEventListener('ended', () => audioContext.close(), {once: true});
    } catch (err) {
        console.error(err);
    }
}