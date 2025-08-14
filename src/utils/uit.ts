export const DPR = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));

export function deepFreeze<T>(obj: T): T {
    if (obj === null ||
        obj === undefined ||
        typeof obj === 'string' ||
        typeof obj !== 'object'
    ) return obj;

    Object.getOwnPropertyNames(obj).forEach((key) => {
        // @ts-ignore
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

export function throttleTimeOut<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let timer: number | null = null;
    return function (...args: Parameters<T>) {
        if (timer) return;
        // @ts-ignore
        func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
    }
}