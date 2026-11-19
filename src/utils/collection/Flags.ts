export class Flags {
    private value: number = 0;

    public val(): number {
        return this.value;
    }

    public has(flag: number): boolean {
        return (this.value & flag) === flag;
    }

    public set(flag: number): number {
        return this.value |= flag;
    }

    public clear(flag: number): number {
        this.value = this.value & ~flag;
        return this.value;
    }

    public toggle(flag: number): number {
        return this.value ^= flag;
    }

    public combine(...flags: number[]): number {
        this.value = flags.reduce((a, b) => a | b, 0);
        return this.value;
    }

    public any(): boolean {
        return this.value !== 0;
    }

    public reset(): void {
        this.value = 0;
    }
}