export class InputBinding {
    private readonly bindings = new Map<string, string[]>();

    public bindAction(action: string, keys: string[]): void {
        this.bindings.set(action, keys);
    }

    public getKeys(action: string): string[] | undefined {
        return this.bindings.get(action);
    }
}