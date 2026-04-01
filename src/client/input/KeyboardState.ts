export class KeyboardState {
    private readonly keys = new Set<string>();
    private prevKeys = new Set<string>();

    public updateEndFrame(): void {
        this.prevKeys = new Set(this.keys);
    }

    public isDown(key: string): boolean {
        return this.keys.has(key);
    }

    public isDownAny(...keys: string[]): boolean {
        return keys.some(k => this.keys.has(k));
    }

    public wasPressed(key: string): boolean {
        return this.keys.has(key) && !this.prevKeys.has(key);
    }

    public wasComboPressed(...keys: string[]): boolean {
        return keys.every(k => this.keys.has(k)) &&
            !keys.every(k => this.prevKeys.has(k));
    }

    public addKey(code: string): void {
        this.keys.add(code);
    }

    public removeKey(code: string): void {
        this.keys.delete(code);
    }

    public clear(): void {
        this.keys.clear();
    }
}
