export class BitFlag {
    public static has(value: number, flag: number): boolean {
        return (value & flag) === flag;
    }

    public static set(value: number, flag: number): number {
        return value | flag;
    }

    public static clear(value: number, flag: number): number {
        return value & ~flag;
    }

    public static toggle(value: number, flag: number): number {
        return value ^ flag;
    }

    public static combine(...flags: number[]): number {
        return flags.reduce((a, b) => a | b, 0);
    }
}